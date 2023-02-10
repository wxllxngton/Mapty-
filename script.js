'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); // Last 10 numbers are the id

  constructor(coords, distance, duration) {
    this.coords = coords; // Array of latitude and longitude
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getMonth()}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;

    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // Defined in min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;

    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // Defined in km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  // Private instance properties
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach events handlers
    // Without .bind() the this keyword will simply point to the form
    form.addEventListener('submit', this._newWorkout.bind(this));

    // Not passing anything so no need for .bind()
    inputType.addEventListener('change', this._toggleElevationField);

    // Move to position of the marker
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    // Using Geolocation API
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        // This keyword will point towards the current object not not return undefined for "this._..." properties in _loadMap()
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position!');
        }
      ); // Takes 2 callback functions (success and error functions)
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // Google Maps Link of current location
    //   console.log(`https://www.google.com/maps/@${latitude},${longitude},10z`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel); // 13 zoom
    //   console.log(map);

    //   https://tile.openstreetmap.org/{z}/{x}/{y}.png // Different theme
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    if (this.#workouts) {
      // Render each workout on map as marker - from Local Storage
      this.#workouts.forEach(work => this._renderWorkoutMarker(work));
    }

    // Used as Event Listener - Handling clicks on map
    // Callback function hence don't need to pass "mapE" argument
    this.#map.on('click', this._showForm.bind(this));
  }

  _showForm(mapE) {
    // console.log(mapEvent);
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    // Hide form - Without scroll down animation
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    // Selects parents not children
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    // Always one is visible by toggling them
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');

    // Clears input fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
  }

  _newWorkout(e) {
    e.preventDefault();

    // Helper functions

    // Check whether all inputs are finite/positive numbers - Returns true if so
    // "...inputs" puts them in an array
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    // Checks whether all inputs are positive
    const allPositives = (...inputs) => inputs.every(inp => inp > 0);

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // Check if data is valid

    // If workout running = create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Using guard clause
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositives(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling = create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositives(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to the workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form and clear input fields
    this._hideForm();

    // Set local storage to all workouts - Updates workouts whenever called
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false, // Pop up doesn't close upon opening another
          closeOnClick: false,
          className: `${workout.type}-popup`, // CSS
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
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

    if (workout.type === 'running') {
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

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed}</span>
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

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return; // Guard clause

    // Find object in #workouts with same id with the element clicked
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      // Duration of the animation
      pan: {
        duration: 1,
      },
    }); // Zoom level
  }

  _setLocalStorage() {
    // Local Storage API - Key Value and value is set as a string
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data); // Logged as string before parsing it

    if (!data) return;

    // Restoring the data in workouts
    this.#workouts = data;

    // Rendering each workout on list
    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  // Delete all workouts
  reset() {
    localStorage.removeItem('workouts');
    // Reloads the page
    location.reload();
  }
}

const app = new App();
