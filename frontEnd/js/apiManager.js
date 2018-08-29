const port = 1337; //Server Port
const UrlToRestaurants = `//localhost:${port}/restaurants`;
const UrlToReviews = `//localhost:${port}/reviews`;
const cacheRefreshInterval = 500;
var testReviewProtocol = {
    action: "getAllReviews",
    targetType: "reviews"
}
class ApiManager {
    static fetchWithServer(protocol, callback) {
        // Check if online
        if (!navigator.onLine && (protocol.action === 'addReview')) {
            DataManager.sendDataWhenOnline(protocol);
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
            case 'addReview':
                init.method = 'POST';
                break;
        }

        fetch(input, init)
            .then((response) => {
                console.log(`Protocol:${protocol.action} executed.`);
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.indexOf('application/json') !== -1) {
                    return response.json();
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
        DataManager.getAllDataFromTargetStore(protocol.targetType)
            .then(data => {
                if (data.length > 0) {
                    console.log("Fetch data from IDB");
                    callback(null, data);

                    //Update local copy if exceed last update
                    let idbLastUpdated = localStorage.getItem('idbLastUpdated');
                    if (!idbLastUpdated || (idbLastUpdated - new Date()) / 1000 > cacheRefreshInterval) {
                        localStorage.setItem('idbLastUpdated', new Date());
                        //fetch new data from server
                        ApiManager.fetchWithServer(protocol, (error, data) => {
                            DataManager.update(protocol.targetType, data);
                        });
                    }
                } else {
                    //Fetch API then store at IDB                    
                    ApiManager.fetchWithServer(protocol, (error, data) => {
                        localStorage.setItem('idbLastUpdated', new Date());


                        DataManager.update(protocol.targetType, data);
                        return data;

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

            if (typeof objects == Array) {
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
            return tx.complete;
        })
    }

    static updateDataWhenOnline(protocol) {
        localStorage.setItem('OfflineData', JSON.stringify(protocol));
        console.log(`${protocol.data} is saved to OfflineData at LocalStorage`);

        window.addEventListener('online', (event) => {

            let data = JSON.parse(localStorage.getItem('data'));
            if (data !== null) {
                console.log(data);

            }
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
    
}