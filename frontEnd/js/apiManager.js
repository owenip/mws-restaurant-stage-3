const port = 1337; //Server Port
const UrlToRestaurants = `//localhost:${port}/restaurants`;
const UrlToReviews = `//localhost:${port}/reviews`;
const cacheRefreshInterval = 500;
var testReviewProtocol = {
    action: "getAllReviews",
    targetType: "reviews"
}
class ApiManager {
    static fetchFromServer(protocol, callback) {
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
                        ApiManager.fetchFromServer(protocol, (error, data) => {
                            DataManager.update(protocol.targetType, data);
                        });
                    }
                } else {
                    //Fetch API then store at IDB                    
                    ApiManager.fetchFromServer(protocol, (error, data) => {
                        localStorage.setItem('idbLastUpdated', new Date());

                        
                        DataManager.update(protocol.targetType, data);
                        return data;
                        
                    });

                }
            });


        let idbLastUpdated = localStorage.getItem('idbLastUpdated');
        if (!idbLastUpdated || (idbLastUpdated - new Date()) / 1000 > cacheRefreshInterval) {
            //TODO: fetch online
        } else {
            //Fetch from local cache
            localStorage.setItem('idbLastUpdated', new Date());
            const dbStorePromise = DataManager.openDbPromise(protocol.targetType);
            DataManager.getAllDataFromTargetStore(protocol.targetType)
                .then(data => {
                    if (data.length > 0) {
                        console.log("Fetch data from IDB");
                        callback(null, data);
                    }
                })
                .then((data) => {
                    callback(null, data);
                });
        }

    }

    static getAllDataFromTargetStore(targetStore) {
        return DataManager.openDbPromise(targetStore)
            .then(db => {
                return db.transaction(targetStore).objectStore(targetStore).getAll();
            });
    }

    static update(targetType, objects) {
        let dbPromise = idb.open(targetType, 1, (upgradeDB) => {
            let store = upgradeDB.createObjectStore(store, {keypath: 'id'});
        });

        dbPromise.then((db) => {
            let tx = db.transaction(targetType, 'readwrite');
            let store = tx.objectStore(targetType);

            objects.forEach( object => {
                store.get(object.id)
                    .then(idbObject => {
                        if(idbObject !== object) {
                            store.put(object);
                            console.log(`Updated ${targetType}: ${object.id}`)
                        }
                    })
            });
            return tx.complete;
        })
    }
}