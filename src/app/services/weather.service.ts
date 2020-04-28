import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
// import { LoadingController } from '@ionic/angular';

import { Config } from '../config';
import { LocationConfig, LocationType } from '../interfaces/location';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {

  constructor(
    private http: HttpClient,
  ) {
    console.log('WeatherService: constructor()');
  }

  private makeWeatherURL(loc: LocationConfig, command: string): string {
    // Build a weather service URL using the command string and
    // location data that we have.
    // Current Conditions
    // api.openweathermap.org/data/2.5/weather?lat=35&lon=139
    // api.openweathermap.org/data/2.5/weather?zip=94040,us
    // Forecast
    // api.openweathermap.org/data/2.5/forecast/daily?lat={lat}&lon={lon}&cnt={cnt}
    // api.openweathermap.org/data/2.5/forecast/daily?zip=94040,us
    console.log('WeatherService: makeWeatherURL()');
    // console.dir(loc);
    let uri = Config.weatherEndpoint + command;
    if (loc.type === LocationType.Geolocation) {
      console.log('makeWeatherURL: Building Location URL');
      //@ts-ignore
      uri += `?lat=${loc.value.latitude}&lon=${loc.value.longitude}`;
    } else {
      console.log('makeWeatherURL: Building Zip Code URL');
      //@ts-ignore
      uri += `?zip=${loc.value.PostalCode}`;
    }
    // Configure output for imperial (English) measurements
    uri += '&units=imperial';
    // Use the following instead for metric
    //  uri += '&units=metric';
    // Append the API Key to the end of the URI
    uri += `&APPID=${Config.weatherKey}`;
    console.log(`Service URL: ${uri}`);
    // Return the value
    return uri;
  }

  getCurrent(loc: LocationConfig): Promise<any> {
    console.log('WeatherService: getCurrent()');
    const url: string = this.makeWeatherURL(loc, 'weather');
    return new Promise((resolve, reject) => {
      this.http.get(url).subscribe(data => {
        resolve(data);
      }, error => {
        console.error(error.message);
        reject(error.message);
      });
    });
  }

  getForecast(loc: LocationConfig): Promise<any> {
    console.log('WeatherService: getForecast()');
    const url: string = this.makeWeatherURL(loc, 'forecast');
    return new Promise((resolve, reject) => {
      this.http.get(url).subscribe(data => {
        resolve(data);
      }, error => {
        console.error(error.message);
        reject(error.message);
      });
    });
  }

}
