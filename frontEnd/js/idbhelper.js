class IDBHelper {
    static get dbPromise() {
        const dbPromise = idb.open('restaurant-db', 1);
        return dbPromise;
    }

    static createRestaurantDb() {
        IDBHelper.deleteRestaurantDb();
        idb.open('restaurant-db', 1, function (upgradeDb) {
            if (!upgradeDb.objectStoreNames.contains('restaurants')) {
                upgradeDb.createObjectStore(
                    'restaurants', {
                        keypath: 'id',
                        autoIncrement: true
                    }
                );
            }

            console.log('restaurant-db has been created.');
        });
    }

    static deleteRestaurantDb() {
        idb.delete('restaurant-db').then(() =>
            console.log('restaurantDb has been deleted.')
        ).catch(() =>
            console.log('restaurantDb not found.')
        );
    }

    static populateRestaurantDb() {
        fetch(DBHelper.DATABASE_URL)
            .then(response => response.json())
            .then(jsonResponse => {
                jsonResponse.map(restaurant => IDBHelper.insertRestaurant(restaurant, this.dbPromise))
            });
    }

    static insertRestaurant(restaurant, dbPromise) {
        dbPromise.then(db => {
            let tx = db.transaction('restaurants', 'readwrite');
            let store = tx.objectStore('restaurants');
            store.add(restaurant);
            // console.log(`Record of ${restaurant.name} is inserted.`);
            return tx.complete
        });
    }

    static getAllRestaurants(dbPromise) {
        return dbPromise.then(db => {
            return db.transaction('restaurants')
                .objectStore('restaurants').getAll();
        })
    }
}