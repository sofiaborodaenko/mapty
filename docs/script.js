"use strict";

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, long]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
}

class Running extends Workout {
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const run = new Running([30, -12], 5.2, 24, 178);
const cycle = new Cycling([30, -12], 27, 95, 523);

// Main class app that handles the loading of the map, position-coordinates, form, displaying markers
class App {
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    // gets the users position on load
    this._getPosition();

    // once the form is submitted
    form.addEventListener("submit", this._newWorkout.bind(this));

    // toggle the input type
    inputType.addEventListener("change", this._toggleElevationField);
  }

  // gets the position of the user
  _getPosition() {
    if (navigator.geolocation) {
      // geolocation api, first function is when successful other when not
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("Could not get your position!");
        }
      );
    }
  }

  // loads the map
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(position);
    console.log(latitude, longitude);
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, 13);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // handling clicks on map
    this.#map.on("click", this._showForm.bind(this));
  }

  // displays the form in the sidebar
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  // changes one of the inputs if its cycling or running
  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  // Creates a new workout
  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    e.preventDefault();

    // get data form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    // gets coordinates on click
    const { lat, lng } = this.#mapEvent.latlng;
    const clickCoord = [lat, lng];

    let workout;

    // if running, create running object
    if (type === "running") {
      const cadence = +inputCadence.value;

      // check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert("Inputs have to be positive numbers");

      // create the object
      workout = new Running(clickCoord, distance, duration, cadence);
    }

    // if cycling, create running object
    if (type === "cycling") {
      const elevation = +inputElevation.value;

      // check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert("Inputs have to be positive numbers");

      // create the object
      workout = new Cycling(clickCoord, distance, duration, elevation);
    }

    // add object to workout array
    this.#workouts.push(workout);

    // render workout on list

    // clear input fields
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        "";

    // display marker

    L.marker(clickCoord, {
      riseOnHover: true,
    })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 50,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: "running-popup",
        })
      )
      .setPopupContent("Workout")
      .openPopup();
  }
}

const app = new App();
