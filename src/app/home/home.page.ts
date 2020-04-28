import { Component } from '@angular/core';
import { AlertController, LoadingController, NavController, Platform } from '@ionic/angular';
import { Geolocation, Plugins } from '@capacitor/core';

import { Config } from '../config';
import { WeatherService } from '../services/weather.service';
import { LocationConfig, LocationType } from '../interfaces/location';

const { Keyboard } = Plugins;

// TODO: Add unit dropdown (metric/imperial)
// TODO: Add country selection for Zip Code entry
// TODO: Add weather icon to data array and display it on the page

enum TempScale { Fahrenheit, Celsius }

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  // This is used to set the Ionic Segment to the first item
  currentMode: string = 'current';
  // used to control which content is displayed on the home page
  displayMode: string = this.currentMode;
  // an empty object (for now) to store our location data passed to the API
  // currentLoc: any = {};
  // a placeholder for the current location (geolocation or zip code)
  locationConfig: LocationConfig;
  // Mapped to the search field
  searchInput: string = '';
  // current weather items array
  currentItems: Array<any> = [];
  // forecast items array
  forecastItems: Array<any> = [];

  // array of day strings used when rendering data
  DAYS: Array<string> = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  constructor(
    public alertController: AlertController,
    public loadingCtrl: LoadingController,
    public nav: NavController,
    public platform: Platform,
    public weather: WeatherService
  ) {
  }

  ionViewDidEnter() {
    console.log('HomePage: ionViewDidEnter()');
    // Make sure our Config file is populated
    console.log('Checking app configuration');
    if (Config.weatherKey.length < 1) {
      const msg = 'Missing Config.weatherKey value';
      console.warn(msg);
      this.showAlert(msg, 'Configuration Error', 'Try Again');
    } else {
      // Populate the page with the current location data
      this.getLocalWeather();
    }
  }

  getLocalWeather() {
    console.log('HomePage: getLocalWeather()');
    this.loadingCtrl.create({ message: 'Retrieving Location' })
      .then(loader => {
        // display it
        loader.present();
        // then go get the location
        const locOptions = { maximumAge: 3000, timeout: 5000, enableHighAccuracy: true };
        Geolocation.getCurrentPosition(locOptions)
          //@ts-ignore
          .then((position: GeolocationCoordinates) => {
            // Hide the loading indicator
            loader.dismiss();
            // Do we have coordinates?
            if (position) {
              // Then populate the location config object
              this.locationConfig = {
                type: LocationType.Geolocation,
                value: {
                  longitude: position.coords.longitude,
                  latitude: position.coords.latitude
                }
              };
              this.updatePage();
            } else {
              const msg = 'Position object empty.';
              console.error(msg);
              this.showAlert(msg, 'Location Error');
            }
          })
          .catch(e => {
            // Hide the loading indicator
            loader.dismiss();
            console.error(e.message);
            this.showAlert(e.message, 'Location Error');
          });
      });
  }

  setPostalCode() {
    // whenever the user enters a zip code, replace the current location
    // with the entered value, then show current weather for the selected
    // location.
    console.log(`HomePage: setPostalCode(${this.searchInput})`);
    // Hide the keyboard if it's open, just in case
    // TODO: Put the following line back in for production
    Keyboard.hide();
    // Do we have input from the user?
    if (this.searchInput.length > 0) {
      // Is it a Zip Code?
      const re = RegExp('^[0-9]{5}(?:-[0-9]{4})?$');
      if (re.test(this.searchInput)) {
        // populate the location object
        this.locationConfig = {
          type: LocationType.PostalCode,
          value: { PostalCode: this.searchInput }
        }
        // Clear the Zip Code input field
        this.searchInput = '';
        // Switch to the 'current' tab
        this.displayMode = this.currentMode;
        // Update the page
        this.updatePage();
      } else {
        const msg = 'Input is not a valid Zip Code.';
        console.log(`HomePage: ${msg}`);
        this.showAlert(msg, 'Input Error', 'Try Again');
      }
    } else {
      const msg = 'Zip Code input field is empty.';
      console.log(`HomePage: ${msg}`);
      this.showAlert(msg, 'Input Error', 'Try Again');
    }
  }

  updatePage() {
    console.log('HomePage: updatePage()');
    // Do we have a location config?
    if (this.locationConfig) {
      // Get the weather conditions for the current location configuration 
      // (zip code or geolocation)
      this.updateCurrentWeather();
      this.updateForecast();
    } else {
      console.log('HomePage: Skipping page update, no location set');
    }
  }

  makeDegreeString(temperatureValue: number) {
    return `${temperatureValue} degrees (F)`;
  }

  private formatWeatherData(data: any): any {
    // TODO: Should probably move this to the weather service
    console.log('HomePage: formatWeatherData()');
    // create a blank array to hold our results
    const tmpArray = [];
    // Add the weather data values to the array
    if (data.name) {
      // Location name will only be available for current conditions
      tmpArray.push({ name: 'Location', value: data.name });
    }
    tmpArray.push({ name: 'Temperature', value: this.makeDegreeString(data.main.temp) });
    tmpArray.push({ name: 'Low', value: this.makeDegreeString(data.main.temp_min) });
    tmpArray.push({ name: 'High', value: this.makeDegreeString(data.main.temp_max) });
    tmpArray.push({ name: 'Humidity', value: `${data.main.humidity} %` });
    tmpArray.push({ name: 'Pressure', value: `${data.main.pressure} hPa` });
    tmpArray.push({ name: 'Wind', value: `${data.wind.speed} mph` });
    // Do we have visibility data?
    if (data.visibility) {
      tmpArray.push({ name: 'Visibility', value: `${data.visibility} meters` });
    }
    // do we have sunrise/sunset data?
    if (data.sys.sunrise) {
      const sunriseDate = new Date(data.sys.sunrise * 1000);
      tmpArray.push({ name: 'Sunrise', value: sunriseDate.toLocaleTimeString() });
    }
    if (data.sys.sunset) {
      const sunsetDate = new Date(data.sys.sunset * 1000);
      tmpArray.push({ name: 'Sunset', value: sunsetDate.toLocaleTimeString() });
    }
    // Do we have a coordinates object? only if we passed it in on startup
    if (data.coord) {
      // Then grab long and lat
      tmpArray.push({ name: 'Latitude', value: data.coord.lat });
      tmpArray.push({ name: 'Longitude', value: data.coord.lon });
    }
    // Return the new array to the calling function
    return tmpArray;
  }

  updateCurrentWeather() {
    console.log('HomePage: updateCurrentWeather()');
    // clear out the previous array contents
    this.currentItems = [];
    // Create the loading indicator
    this.loadingCtrl.create({ message: 'Retrieving current conditions...' })
      .then(loader => {
        // display it
        loader.present();
        // then go get the weather
        this.weather.getCurrent(this.locationConfig)
          .then(data => {
            // Hide the loading indicator
            loader.dismiss();
            // Now, populate the array with data from the weather service
            if (data) {
              // We have data, so lets do something with it
              this.currentItems = this.formatWeatherData(data);
            }
          },
            error => {
              // Hide the loading indicator
              loader.dismiss();
              console.error('Error retrieving weather data');
              console.dir(error);
              this.showAlert(error);
            }
          );
      });
  }

  updateForecast() {
    console.log('HomePage: updateForecast()');
    // clear out the previous array contents
    this.forecastItems = [];
    // Create the loading indicator
    this.loadingCtrl.create({ message: 'Retrieving forecast...' })
      .then(loader => {
        // Show the loading indicator
        loader.present();
        // then go get the weather
        this.weather.getForecast(this.locationConfig).then(
          data => {
            // Hide the loading indicator
            loader.dismiss();
            // Now, populate the array with data from the weather service
            // Do we have some data?
            if (data) {
              // Then lets build the results array we need
              // Process each forecast period in the array
              for (let period of data.list) {
                // Create a record consisting of a time period's results
                const weatherValues: any = this.formatWeatherData(period);
                // Append this, along with the time period information, into the forecast
                // items array
                const d = new Date(period.dt_txt.replace(' ', 'T'));
                // Determine the day of the week
                const day = this.DAYS[d.getDay()];
                // And the time
                const tm = d.toLocaleTimeString();
                // Create a new object in the results array for this period
                this.forecastItems.push({ period: `${day} at ${tm}`, values: weatherValues });
              }
            } else {
              // This really should never happen
              console.error('Error displaying weather data: Data object is empty');
            }
          },
          error => {
            // Hide the loading indicator
            loader.dismiss();
            console.error('Error retrieving weather data');
            console.dir(error);
            this.showAlert(error);
          }
        );
      });
  }

  viewForecast(item: any) {
    console.log('HomePage: viewForecast()');
    // When the user selects one of the Forecast periods,
    // open up the details page for the selected period.
    this.nav.navigateForward('/weather', { state: { forecast: item } });
  }

  showAlert(theMessage: string, theHeader: string = 'Error', theButton: string = 'Sorry') {
    this.alertController.create({
      header: theHeader,
      message: theMessage,
      buttons: [{ text: theButton }]
    }).then((alert) => alert.present());
  }

}
