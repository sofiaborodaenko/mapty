"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

const allBtns = document.querySelector(".buttons");
const deleteWorkouts = document.querySelector(".btn--delete");
const sortWorkouts = document.querySelector(".btn--sort");

const alertNotif = document.querySelector(".notification");

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, long]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = "running";

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// Main class app that handles the loading of the map, position-coordinates, form, displaying markers
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #sortedWorkouts = this.#workouts;
  #sorted = false;

  constructor() {
    // gets the users position on load
    this._getPosition();

    // get data from local storage
    this._getLocalStorage();

    // Attaching event handlers
    // once the form is submitted
    form.addEventListener("submit", this._newWorkout.bind(this));

    // toggle the input type
    inputType.addEventListener("change", this._toggleElevationField);

    // moves to marker on click
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));

    // deletes single chosen workout
    // containerWorkouts.addEventListener(
    //   "click",
    //   this._deleteSingleWorkout.bind(this)
    // );

    // deletes all the workouts on the local storage
    deleteWorkouts.addEventListener("click", this._reset);

    // removes or adds the buttons
    this._removeButtons();

    // sorts the workouts
    sortWorkouts.addEventListener("click", this._sortByDistance.bind(this));
  }

  // Gets the position of the user
  _getPosition() {
    if (navigator.geolocation) {
      // geolocation api, first function is when successful other when not
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        this._alert
      );
    }
  }

  // Loads the map
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // handling clicks on map
    this.#map.on("click", this._showForm.bind(this));

    // renders the marker if there is data in local storage
    this.#workouts.forEach((workout) => this._renderWorkoutMarker(workout));
  }

  // Displays the form in the sidebar
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  // Hides the form after the input is entered
  _hideForm() {
    // clear input fields
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        "";

    form.style.dislpay = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  // Changes one of the inputs if its cycling or running
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

    // adds the buttons
    this._removeButtons();

    // render workout on list
    this._renderWorkout(workout);

    // display marker
    this._renderWorkoutMarker(workout);

    // hide form
    this._hideForm();

    // set local storage to all workouts
    this._setLocalStorage();
  }

  // Renders the marker on the map
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords, {
      riseOnHover: true,
    })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 50,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();
  }

  // Adds the workout to the sidebar
  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${
            workout.description
          } <span class="delete--workout">🗑️</span></h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    
    `;

    if (workout.type === "running") {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
        `;
    }

    if (workout.type === "cycling") {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
        `;
    }

    form.insertAdjacentHTML("afterend", html);
  }

  // Moves to the popup when user clicks on the item from the sidebar
  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");

    // deletes the workout if clicked on garbage
    if (e.target.matches(".delete--workout")) {
      this._deleteSingleWorkout(workoutEl); // deletes the workout
    } else {
      if (!workoutEl) return;

      // finds the workout through the id
      const workout = this.#workouts.find(
        (work) => work.id === workoutEl.dataset.id
      );

      // pans to the workout
      this.#map.setView(workout.coords, this.#mapZoomLevel, {
        animate: true,
        pan: {
          duration: 1,
        },
      });
    }
  }

  // Deletes the given workout
  _deleteSingleWorkout(workout) {
    const allWorkoutsLogged = document.querySelectorAll(
      ".workout.workout--running, .workout.workout--cycling"
    );

    console.log(workout);
    console.log(this.#workouts);

    const workoutID = workout.dataset.id; // gets the id

    const workoutIndex = this.#workouts.findIndex((w) => w.id === workoutID); // gets index
    this.#workouts.splice(workoutIndex, 1); // removes from array
    // resets local storage
    this._setLocalStorage();
    // location.reload();
    // console.log(this.#workouts);

    // removes the element from the sidebar
    allWorkoutsLogged.forEach((el) => {
      if (el.dataset.id === workoutID) el.remove();
    });
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));

    if (!data) return;

    // resetting the workouts array if there is data in local storage
    this.#workouts = data;
    this.#workouts.forEach((workout) => this._renderWorkout(workout));
  }

  // Clears the local storage
  _reset() {
    localStorage.removeItem("workouts");
    location.reload();
    this._removeButtons();
  }

  // Removes/adds the buttons
  _removeButtons() {
    if (!this.#workouts.length) {
      deleteWorkouts.classList.add("hidden");
      sortWorkouts.classList.add("hidden");
    } else {
      deleteWorkouts.classList.remove("hidden");
      sortWorkouts.classList.remove("hidden");
    }
  }

  // Sorts the workouts by distance
  _sortByDistance() {
    // gets all of the workouts logged onto the sidebar
    const allWorkouts = document.querySelectorAll(
      ".workout.workout--running, .workout.workout--cycling"
    );
    // removes the elements
    allWorkouts.forEach((el) => el.remove());

    // sorts/unsorts the workouts if the buttons is selected
    this.#sortedWorkouts = this.#sorted
      ? this.#workouts.slice().sort((a, b) => a.distance - b.distance)
      : this.#workouts;

    this.#sortedWorkouts.forEach((workout) => this._renderWorkout(workout));
    this.#sorted = !this.#sorted;
  }

  _alert() {
    alertNotif.classList.remove("hidden");
    setTimeout(() => alertNotif.classList.add("hidden"), 3000);
  }
}

const app = new App();
