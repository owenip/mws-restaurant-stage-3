const port = 1337; //Server Port
const UrlToRestaurants = `//localhost:${port}/restaurants`;
const UrlToReviews = `//localhost:${port}/reviews`;
const cacheRefreshInterval = 10;

class ApiManager {
    static fetchWithServer(protocol, callback) {
        // Check if online
        if (!navigator.onLine && (protocol.action === 'addReview')) {
            DataManager.updateDataWhenOnline(protocol);
            return;
        }

        let input;
        let init = {
            method: 'GET'
        };

        switch (protocol.action) {
            case 'getAllRestaurant':
                input = UrlToRestaurants;
                break;
            case 'getRestaurantById':
                input = `${UrlToRestaurants}/${protocol.targetObjId}`;
                break;
            case 'getAllReviews':
                input = UrlToReviews;
                break;
            case 'getReviewsById':
                input = `${UrlToReviews}/${protocol.targetObjId}`;
                break;
            case 'getReviewsByRestaurantID':
                input = `${UrlToReviews}/?restaurant_id=${protocol.targetObjId}`;
                break;
            case 'addReview':
                input = UrlToReviews;

                let review = {
                    'name': protocol.data[0],
                    'rating': parseInt(protocol.data[1]),
                    'comments': protocol.data[2],
                    'restaurant_id': parseInt(protocol.data[3])
                };

                init.method = 'POST';
                init.body = JSON.stringify(review);
                init.headers = new Headers({
                    'Content-Type': 'application/json'
                })
                break;
            default:
                break;
        }

        fetch(input, init)
            .then((response) => {
                console.log(`Protocol:${protocol.action} executed.`);
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.indexOf('application/json') !== -1) {
                    return response.json();
                } else {
                    return;
                }
            })
            .then((data) => {
                console.log(`Fetched data for Protocol:${protocol.action} from server`);
                callback(null, data);
            })
            .catch(error => callback(error, null));
    }


}

class DataManager {
    static openDbPromise(store) {
        switch (store) {
            case 'restaurants':
                let restaurantDbPromise = idb.open('restaurants', 1, (upgradeDB) => {
                    let restaurantStore = upgradeDB.createObjectStore('restaurants', {
                        keyPath: 'id'
                    });
                });
                return restaurantDbPromise;
            case 'reviews':
                let reviewDbPromise = idb.open('reviews', 1, (upgradeDB) => {
                    let reviewStore = upgradeDB.createObjectStore('reviews', {
                        keyPath: 'id'
                    });
                    reviewStore.createIndex('by-restaurantId', 'restaurant_id');
                });
                return reviewDbPromise;
        }
    }

    static fetchData(protocol, callback) {
        const dbStorePromise = DataManager.openDbPromise(protocol.targetType);
        // DataManager.getAllDataFromTargetStore(protocol.targetType)
        dbStorePromise.then(db => {
            let tx = db.transaction(protocol.targetType);
            let store = tx.objectStore(protocol.targetType);
            return store.getAll();
        }).then(data => {
            if (data.length > 0) {
                console.log("Fetch data from IDB");
                callback(null, data);

                //Update local copy if exceed last update
                let idbLastUpdated = localStorage.getItem('idbLastUpdated');
                let diff = idbLastUpdated - new Date().getTime();
                if (!idbLastUpdated || (diff) / 1000 < cacheRefreshInterval) {
                    localStorage.setItem('idbLastUpdated', new Date().getTime());
                    //fetch new data from server
                    ApiManager.fetchWithServer(protocol, (error, data) => {
                        DataManager.update(protocol.targetType, data);
                    });
                    // ApiManager.fetchWithServer(protocol, (error, data) => {

                    // })
                }
            } else {
                localStorage.setItem('idbLastUpdated', new Date().getTime());
                //Fetch API then store at IDB                    
                ApiManager.fetchWithServer(protocol, (error, data) => {
                    DataManager.openDbPromise(protocol.targetType).then( db => {
                        let tx = db.transaction(protocol.targetType, 'readwrite');
                        let store = tx.objectStore(protocol.targetType);

                        data.forEach( object => {
                            store.put(object);
                        })
                        return data;
                    }).then((data) => callback(null, data));
                });

            }
        });
    }

    static getAllDataFromTargetStore(targetStore) {
        return DataManager.openDbPromise(targetStore).then(db => {
            return db.transaction(targetStore).objectStore(targetStore).getAll();
        });
    }

    static update(targetType, objects) {
        let dbPromise = idb.open(targetType, 1, (upgradeDB) => {
            let store = upgradeDB.createObjectStore(store, {
                keypath: 'id'
            });
        });

        dbPromise.then((db) => {
            let tx = db.transaction(targetType, 'readwrite');
            let store = tx.objectStore(targetType);

            if (Array.isArray(objects)) {
                objects.forEach(object => {
                    store.get(object.id)
                        .then(idbObject => {
                            if (JSON.stringify(idbObject) !== JSON.stringify(object)) {
                                store.put(object);
                                console.log(`Updated ${targetType}: ${object.id}`)
                            }
                        })
                });
            } else {
                store.put(objects);
                console.log(`Updated ${targetType}: ${objects.id}`)
            }
            return objects;
        });
    }

    static updateDataWhenOnline(protocol) {
        localStorage.setItem('OfflineData', JSON.stringify(protocol));
        console.log(`${protocol.data} is saved to OfflineData at LocalStorage`);

        window.addEventListener('online', (event) => {

            let data = JSON.parse(localStorage.getItem('OfflineData'));
            if (data !== null) {
                console.log(data);
                ApiManager.fetchWithServer(protocol, (error, data) => {
                    if (error) {
                        console.log(error);
                    } else {
                        DataManager.update(protocol.targetType, data);
                        console.log(data);
                    }
                });
                console.log('Offline data uploaded');

                localStorage.removeItem('OfflineData');
                console.log('Offline data cleared');
            }
            console.log('Online');
        });
    }

    static getRestaurantById(id, callback) {
        let protocol = {
            targetType: 'restaurants',
            action: 'getRestaurantById',
            targetObjId: id
        };

        DataManager.fetchData(protocol, (error, restaurants) => {
            if (error || restaurants.length <= 0) {
                callback(error, null);
            } else {
                const restaurant = restaurants.find(r => r.id == id);
                if (restaurant) { // Got the restaurant
                    callback(null, restaurant);
                } else { // Restaurant does not exist in the database
                    callback('Restaurant does not exist', null);
                }
            }

        });
    }

    static getRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
        let protocol = {
            targetType: 'restaurants',
            action: 'getAllRestaurant'
        };

        DataManager.fetchData(protocol, (error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                let results = restaurants;
                if (cuisine != 'all') { // filter by cuisine
                    results = results.filter(r => r.cuisine_type == cuisine);
                }
                if (neighborhood != 'all') { // filter by neighborhood
                    results = results.filter(r => r.neighborhood == neighborhood);
                }
                callback(null, results);
            }
        });
    }

    static getRestaurantByCuisine(cuisine, callback) {
        let protocol = {
            targetType: 'restaurants',
            action: 'getAllRestaurant'
        };

        DataManager.fetchData(protocol, (error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                let results = restaurants;
                if (cuisine != 'all') { // filter by cuisine
                    results = results.filter(r => r.cuisine_type == cuisine);
                }
                callback(null, results);
            }
        });
    }

    static getRestaurantByNeighborhood(neighborhood, callback) {
        let protocol = {
            targetType: 'restaurants',
            action: 'getAllRestaurant'
        };

        DataManager.fetchData(protocol, (error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                let results = restaurants;
                if (neighborhood != 'all') { // filter by neighborhood
                    results = results.filter(r => r.neighborhood == neighborhood);
                }
                callback(null, results);
            }
        });
    }

    static getNeighborhoods(callback) {
        let protocol = {
            targetType: 'restaurants',
            action: 'getAllRestaurant'
        };

        DataManager.fetchData(protocol, (error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all neighborhoods from all restaurants
                const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
                // Remove duplicates from neighborhoods
                const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
                callback(null, uniqueNeighborhoods);
            }
        });
    }

    static getCuisines(callback) {
        let protocol = {
            targetType: 'restaurants',
            action: 'getAllRestaurant'
        };

        DataManager.fetchData(protocol, (error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all cuisines from all restaurants
                const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
                // Remove duplicates from cuisines
                const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
                callback(null, uniqueCuisines);
            }
        });
    }

    static getReviewsByRestaurantId(restaurantId, callback) {
        let protocol = {
            targetType: 'reviews',
            targetObjId: restaurantId,
            action: 'getReviewsByRestaurantID'
        };

        DataManager.fetchData(protocol, (error, reviews) => {
            if (error) {
                callback(error, null);
            } else {
                const results = reviews.filter(r => r.restaurant_id === restaurantId);
                callback(null, results);
            }
        });
    }

    static addReview(review) {
        let protocol = {
            targetType: 'reviews',
            action: 'addReview',
            data: review
        };

        ApiManager.fetchWithServer(protocol, (error, data) => {
            if (error) {
                callback(error, null);
            } else {
                console.log("review uploaded");
            }
        });

    }

    /**
     * Restaurant page URL.
     */
    static urlForRestaurant(restaurant) {
        return (`./restaurant.html?id=${restaurant.id}`);
    }

    /**
     * Restaurant image URL.
     */
    static imageUrlForRestaurant(restaurant) {
        return (`/img/${restaurant.photograph}.jpg`);
    }

    /**
     * Map marker for a restaurant.
     */
    static mapMarkerForRestaurant(restaurant, map) {
        // https://leafletjs.com/reference-1.3.0.html#marker  
        const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng], {
            title: restaurant.name,
            alt: restaurant.name,
            url: DataManager.urlForRestaurant(restaurant)
        });
        marker.addTo(newMap);
        return marker;
    }
}