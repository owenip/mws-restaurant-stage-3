let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap(); // added 


  let protocol = {
    targetType: 'restaurants',
    action: 'getAllRestaurant'
  };

  DataManager.fetchData(protocol, (error, data) => {    
    fetchNeighborhoods();
    fetchCuisines();
    updateRestaurants();
  });

});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  // DBHelper.fetchNeighborhoods((error, neighborhoods) => {
  //   if (error) { // Got an error
  //     console.error(error);
  //   } else {
  //     self.neighborhoods = neighborhoods;
  //     fillNeighborhoodsHTML();
  //   }
  // });
  DataManager.getNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  })
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  // DBHelper.fetchCuisines((error, cuisines) => {
  //   if (error) { // Got an error!
  //     console.error(error);
  //   } else {
  //     self.cuisines = cuisines;
  //     fillCuisinesHTML();
  //   }
  // });
  DataManager.getCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  if ("undefined" != typeof L) {
    self.newMap = L.map('map', {
      center: [40.722216, -73.987501],
      zoom: 12,
      scrollWheelZoom: false
    });
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
      mapboxToken: 'pk.eyJ1IjoiaXBvd2VuIiwiYSI6ImNqa3hjaWxxbjA3OWczdnA4cjVnZ3oxdDYifQ.r2Dsocg7BY9fcbu_JCeYRQ',
      maxZoom: 18,
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: 'mapbox.streets'
    }).addTo(newMap);
  }
  updateRestaurants();
}
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  // DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
  //   if (error) { // Got an error!
  //     console.error(error);
  //   } else {
  //     resetRestaurants(restaurants);
  //     fillRestaurantsHTML();
  //   }
  // })
  DataManager.getRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  if(typeof restaurants == 'undefined') updateRestaurants();  
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach((restaurant) => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  li.className = 'restaurant-card';

  const image = document.createElement('img');
  image.className = 'card-img';

  //image.src = DBHelper.imageUrlForRestaurant(restaurant);
  const imageDefaultSrc = DBHelper.imageUrlForRestaurant(restaurant);
  const imageParts = imageDefaultSrc.split('.');

  const imageSmall = imageParts[0] + '-480_small.' + imageParts[1];
  // const imageMedium = imageParts[0] + '-800_medium.' + imageParts[1];
  // image.srcset = `${imageSmall} 480w, ${imageMedium} 800w`;
  // image.src = imageDefaultSrc;

  image.src = imageSmall;
  image.alt = restaurant.name + ` restaurant promotional image`;
  li.append(image);

  const name = document.createElement('h1');
  name.className = 'card-title'
  name.innerHTML = restaurant.name;
  li.append(name);

  const cardContent = document.createElement('div');
  cardContent.className = 'card-textArea';

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  cardContent.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  cardContent.append(address);
  li.append(cardContent);

  const more = document.createElement('a');
  more.className = 'card-action';
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);

  li.append(more);

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  // restaurants.forEach(restaurant => {
  //   // Add marker to the map
  //   const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
  //   marker.on("click", onClick);

  //   function onClick() {
  //     window.location.href = marker.options.url;
  //   }
  //   self.markers.push(marker);
  // });
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DataManager.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);

    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });
}
/* addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
} */