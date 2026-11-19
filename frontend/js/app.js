/* =========================================================
   BMTC LIVE TRANSIT
   Real-time simulated bus movement
   Passenger GPS broadcasting enabled
========================================================= */

const API = "";


/* =========================================================
   ROUTES
========================================================= */

const routes = {
  "500D": {
    name: "500D",
    subtitle: "Fresh Morning Transit",
    distance: "22.7",

    directions: {
      1: "Hebbal → Silk Board",
      2: "Silk Board → Hebbal"
    },

    directionIds: [1, 2]
  },

  "304": {
    name: "304",
    subtitle: "Tin Factory ↔ Channasandra",
    distance: "15.4",

    directions: {
      3: "Tin Factory → Channasandra",
      4: "Channasandra → Tin Factory"
    },

    directionIds: [3, 4]
  }
};


/* =========================================================
   STATE
========================================================= */

let currentRoute = "500D";

let dir = 1;

let stops = [];

let bO = 0;
let dO = 0;

/*
  Actual current bus stop.
  This is NOT the selected boarding stop.
*/
let busO = 0;

let latestBusData = [];

let pollTimer = null;


/* =========================================================
   PASSENGER GPS STATE
========================================================= */

let sharing = false;

let watchId = null;


/* =========================================================
   STARTUP
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

  /* -------------------------------------------------------
     ROUTE BUTTONS
  ------------------------------------------------------- */

  const route500 =
    document.getElementById("route-500");

  if (route500) {

    route500.addEventListener(
      "click",
      function () {

        switchRoute("500D");

      }
    );

  }


  const route304 =
    document.getElementById("route-304");

  if (route304) {

    route304.addEventListener(
      "click",
      function () {

        switchRoute("304");

      }
    );

  }


  /* -------------------------------------------------------
     DIRECTION BUTTON 1
  ------------------------------------------------------- */

  const t1 =
    document.getElementById("t1");

  if (t1) {

    t1.addEventListener(
      "click",
      function () {

        switchDirection(
          routes[currentRoute].directionIds[0]
        );

      }
    );

  }


  /* -------------------------------------------------------
     DIRECTION BUTTON 2
  ------------------------------------------------------- */

  const t2 =
    document.getElementById("t2");

  if (t2) {

    t2.addEventListener(
      "click",
      function () {

        switchDirection(
          routes[currentRoute].directionIds[1]
        );

      }
    );

  }


  /* -------------------------------------------------------
     BOARDING SELECT
  ------------------------------------------------------- */

  const boarding =
    document.getElementById("sel-b");

  if (boarding) {

    boarding.addEventListener(
      "change",
      chgB
    );

  }


  /* -------------------------------------------------------
     DESTINATION SELECT
  ------------------------------------------------------- */

  const destination =
    document.getElementById("sel-d");

  if (destination) {

    destination.addEventListener(
      "change",
      chgD
    );

  }


  /* -------------------------------------------------------
     ETA BUTTON
  ------------------------------------------------------- */

  const etaButton =
    document.getElementById("eta-btn");

  if (etaButton) {

    etaButton.addEventListener(
      "click",
      getETA
    );

  }


  /* -------------------------------------------------------
     PASSENGER GPS BUTTON
  ------------------------------------------------------- */

  const gpsButton =
    document.getElementById("gps-btn");

  if (gpsButton) {

    gpsButton.addEventListener(
      "click",
      toggleGPS
    );

  }


  /* -------------------------------------------------------
     START DEFAULT ROUTE
  ------------------------------------------------------- */

  switchRoute("500D");

});


/* =========================================================
   ROUTE SWITCH
========================================================= */

function switchRoute(routeName) {

  if (!routes[routeName]) {
    return;
  }


  currentRoute =
    routeName;


  const routeConfig =
    routes[currentRoute];


  dir =
    routeConfig.directionIds[0];


  bO = 0;

  dO = 0;

  busO = 0;

  latestBusData = [];


  const route500 =
    document.getElementById("route-500");

  if (route500) {

    route500.classList.toggle(
      "active",
      currentRoute === "500D"
    );

  }


  const route304 =
    document.getElementById("route-304");

  if (route304) {

    route304.classList.toggle(
      "active",
      currentRoute === "304"
    );

  }


  const brandRoute =
    document.getElementById(
      "brand-route"
    );

  if (brandRoute) {

    brandRoute.textContent =
      routeConfig.name;

  }


  const brandSubtitle =
    document.getElementById(
      "brand-subtitle"
    );

  if (brandSubtitle) {

    brandSubtitle.textContent =
      routeConfig.subtitle;

  }


  const routeDistance =
    document.getElementById(
      "route-distance"
    );

  if (routeDistance) {

    routeDistance.textContent =
      routeConfig.distance;

  }


  const timelineRoute =
    document.getElementById(
      "timeline-route"
    );

  if (timelineRoute) {

    timelineRoute.textContent =
      routeConfig.name;

  }


  const dir1Label =
    document.getElementById(
      "dir1-label"
    );

  if (dir1Label) {

    dir1Label.textContent =
      routeConfig.directions[
        routeConfig.directionIds[0]
      ];

  }


  const dir2Label =
    document.getElementById(
      "dir2-label"
    );

  if (dir2Label) {

    dir2Label.textContent =
      routeConfig.directions[
        routeConfig.directionIds[1]
      ];

  }


  const t1 =
    document.getElementById("t1");

  if (t1) {

    t1.classList.add("active");

  }


  const t2 =
    document.getElementById("t2");

  if (t2) {

    t2.classList.remove("active");

  }


  hideETA();

  loadStops();

}


/* =========================================================
   DIRECTION SWITCH
========================================================= */

function switchDirection(directionId) {

  dir =
    directionId;


  const routeConfig =
    routes[currentRoute];


  const firstDirection =
    routeConfig.directionIds[0];


  const secondDirection =
    routeConfig.directionIds[1];


  const t1 =
    document.getElementById("t1");

  if (t1) {

    t1.classList.toggle(
      "active",
      directionId === firstDirection
    );

  }


  const t2 =
    document.getElementById("t2");

  if (t2) {

    t2.classList.toggle(
      "active",
      directionId === secondDirection
    );

  }


  bO = 0;

  dO = 0;

  busO = 0;

  latestBusData = [];


  hideETA();

  loadStops();

}


/* =========================================================
   LOAD STOPS
========================================================= */

async function loadStops() {

  try {

    const response =
      await fetch(
        API +
        "/stops?direction_id=" +
        dir
      );


    if (!response.ok) {

      throw new Error(
        "Stops request failed: " +
        response.status
      );

    }


    stops =
      await response.json();


    const totalStops =
      document.getElementById(
        "total-stops"
      );

    if (totalStops) {

      totalStops.textContent =
        stops.length;

    }


    fillSelectors();

    renderRoute();


    const timelineCaption =
      document.getElementById(
        "timeline-caption"
      );

    if (timelineCaption) {

      timelineCaption.textContent =
        getDirectionLabel();

    }


  } catch (error) {

    console.error(
      "Failed to load stops:",
      error
    );


    stops = [];


    const totalStops =
      document.getElementById(
        "total-stops"
      );

    if (totalStops) {

      totalStops.textContent =
        "—";

    }


    const routeList =
      document.getElementById(
        "rlist"
      );

    if (routeList) {

      routeList.innerHTML =
        '<div class="route-error">' +
        "Station sequence unavailable." +
        "<br>" +
        "Verify the Go service is active on :8080." +
        "</div>";

    }

  }

}


/* =========================================================
   DIRECTION LABEL
========================================================= */

function getDirectionLabel() {

  if (!routes[currentRoute]) {

    return "";

  }


  return (
    routes[currentRoute]
      .directions[dir] || ""
  );

}


/* =========================================================
   SELECTORS
========================================================= */

function fillSelectors() {

  const boarding =
    document.getElementById("sel-b");


  const destination =
    document.getElementById("sel-d");


  if (!boarding || !destination) {

    return;

  }


  boarding.innerHTML =
    '<option value="">' +
    "Where are you boarding?" +
    "</option>";


  destination.innerHTML =
    '<option value="">' +
    "Where are you heading?" +
    "</option>";


  stops.forEach(
    function (stop) {

      const option =
        '<option value="' +
        stop.stop_order +
        '">' +
        stop.stop_order +
        ". " +
        escapeHTML(
          stop.stop_name
        ) +
        "</option>";


      boarding.innerHTML +=
        option;


      destination.innerHTML +=
        option;

    }
  );

}


/* =========================================================
   BOARDING CHANGE
========================================================= */

function chgB() {

  const boarding =
    document.getElementById(
      "sel-b"
    );


  if (!boarding) {

    return;

  }


  bO =
    parseInt(
      boarding.value,
      10
    ) || 0;


  renderRoute();

}


/* =========================================================
   DESTINATION CHANGE
========================================================= */

function chgD() {

  const destination =
    document.getElementById(
      "sel-d"
    );


  if (!destination) {

    return;

  }


  dO =
    parseInt(
      destination.value,
      10
    ) || 0;


  renderRoute();

}


/* =========================================================
   START LIVE ETA
========================================================= */

async function getETA() {

  if (!bO || !dO) {

    alert(
      "Please select both boarding and destination stations."
    );

    return;

  }


  if (bO >= dO) {

    alert(
      "Destination stop must be ahead of your boarding point."
    );

    return;

  }


  const etaButton =
    document.getElementById(
      "eta-btn"
    );


  if (!etaButton) {

    return;

  }


  etaButton.innerHTML =
    "<span>Finding Live Bus...</span>";


  etaButton.disabled =
    true;


  try {

    /*
      Immediately check the current bus.
    */

    await pollETA();


    /*
      Continue checking every 5 seconds.

      Simulator moves every ~10 seconds,
      so the UI follows it closely.
    */

    if (pollTimer) {

      clearInterval(
        pollTimer
      );

    }


    pollTimer =
      setInterval(
        pollETA,
        5000
      );


  } finally {

    restoreETAButton();

    etaButton.disabled =
      false;

  }

}


/* =========================================================
   RESTORE ETA BUTTON
========================================================= */

function restoreETAButton() {

  const etaButton =
    document.getElementById(
      "eta-btn"
    );


  if (!etaButton) {

    return;

  }


  etaButton.innerHTML =
    '<span>Check Live Arrival</span>' +
    '<svg width="15" height="15" ' +
    'viewBox="0 0 24 24" ' +
    'fill="none" ' +
    'stroke="currentColor" ' +
    'stroke-width="2.2">' +
    '<path d="M5 12h14M12 5l7 7-7 7"></path>' +
    '</svg>';

}


/* =========================================================
   GET ETA DATA FOR EVERY STOP
========================================================= */

async function pollETA() {
  if (!stops.length) {
    return;
  }

  // Fetch corridor summary in a single batch request
  try {
    const summaryResp = await fetch(
      API + "/eta/all?direction_id=" + encodeURIComponent(dir),
      { cache: "no-store" }
    );
    if (summaryResp.ok) {
      const summary = await summaryResp.json();
      if (summary && summary.stops && summary.stops.length) {
        busO = Number(summary.bus_stop_order) || 0;
        latestBusData = summary.stops.map(function(s) {
          return {
            stop_name: s.stop_name,
            stop_order: s.stop_order,
            eta_seconds: s.eta_seconds,
            eta_minutes: s.eta_minutes,
            updated_at: summary.updated_at,
            status: s.status
          };
        });
        const currRec = latestBusData.find(function(it) {
          return Number(it.stop_order) === busO;
        }) || latestBusData[0];
        renderLiveETA(latestBusData, currRec);
        renderRoute();
        return;
      }
    }
  } catch (e) {
    // Fallback to individual requests if summary not ready
  }


  if (!stops.length) {

    return;

  }


  try {

    /*
      Backend endpoint:

      /eta?direction_id=X&stop_name=Y

      We query every stop.

      This allows us to determine which stop
      received the latest bus ping.
    */

    const requests =
      stops.map(
        async function (stop) {

          try {

            const response =
              await fetch(
                API +
                "/eta?direction_id=" +
                encodeURIComponent(dir) +
                "&stop_name=" +
                encodeURIComponent(
                  stop.stop_name
                ),
                {
                  cache: "no-store"
                }
              );


            if (!response.ok) {

              return null;

            }


            const data =
              await response.json();


            return data;


          } catch (error) {

            return null;

          }

        }
      );


    const results =
      await Promise.all(
        requests
      );


    latestBusData =
      results.filter(
        function (item) {

          return item !== null;

        }
      );


    if (!latestBusData.length) {

      showNoData();

      busO = 0;

      renderRoute();

      return;

    }


    /*
      Find newest timestamp.
    */

    let newestTimestamp =
      0;


    latestBusData.forEach(
      function (item) {

        const timestamp =
          Number(
            item.updated_at
          ) || 0;


        if (
          timestamp >
          newestTimestamp
        ) {

          newestTimestamp =
            timestamp;

        }

      }
    );


    /*
      Keep only records created
      by the latest bus ping.
    */

    const newestRecords =
      latestBusData.filter(
        function (item) {

          return (
            Number(
              item.updated_at
            ) ===
            newestTimestamp
          );

        }
      );


    if (!newestRecords.length) {

      showNoData();

      return;

    }


    /*
      CRITICAL:

      The current bus stop is the LOWEST
      stop_order in the newest batch.

      Example:

      Ping at stop 5

      Redis receives:

      5
      6
      7
      8
      ...

      Minimum stop_order = 5

      Therefore:

      BUS IS AT STOP 5
    */

    const currentRecord =
      newestRecords.reduce(
        function (lowest, item) {

          if (!lowest) {

            return item;

          }


          return Number(
            item.stop_order
          ) <
          Number(
            lowest.stop_order
          )
            ? item
            : lowest;

        },
        null
      );


    busO =
      currentRecord
        ? Number(
            currentRecord.stop_order
          )
        : 0;


    renderLiveETA(
      newestRecords,
      currentRecord
    );


    renderRoute();


  } catch (error) {

    console.error(
      "Live ETA request failed:",
      error
    );


    showNoData();

  }

}


/* =========================================================
   RENDER LIVE ETA
========================================================= */

function renderLiveETA(
  newestRecords,
  currentRecord
) {

  if (!currentRecord) {

    showNoData();

    return;

  }


  const currentStop =
    findStopByOrder(
      busO
    );


  const boardingStop =
    findStopByOrder(
      bO
    );


  const destinationStop =
    findStopByOrder(
      dO
    );


  if (!currentStop) {

    return;

  }


  /*
    Find latest ETA record for boarding.
  */

  const boardingRecord =
    newestRecords.find(
      function (item) {

        return (
          Number(
            item.stop_order
          ) === bO
        );

      }
    );


  /*
    Find latest ETA record for destination.
  */

  const destinationRecord =
    newestRecords.find(
      function (item) {

        return (
          Number(
            item.stop_order
          ) === dO
        );

      }
    );


  /* -----------------------------------------
     BUS CURRENT LOCATION
  ----------------------------------------- */

  const busAt =
    document.getElementById(
      "bus-at"
    );


  if (busAt) {

    busAt.textContent =
      currentStop.stop_name;

  }


  /* -----------------------------------------
     BOARDING STOP
  ----------------------------------------- */

  const labelBoarding =
    document.getElementById(
      "lbl-b"
    );


  if (labelBoarding) {

    labelBoarding.textContent =
      boardingStop
        ? boardingStop.stop_name
        : "—";

  }


  /* -----------------------------------------
     DESTINATION STOP
  ----------------------------------------- */

  const labelDestination =
    document.getElementById(
      "lbl-d"
    );


  if (labelDestination) {

    labelDestination.textContent =
      destinationStop
        ? destinationStop.stop_name
        : "—";

  }


  /* -----------------------------------------
     BOARDING ETA
  ----------------------------------------- */

  let boardingETA;


  if (busO > bO) {

    /*
      Bus already passed boarding point.
    */

    boardingETA =
      "PASSED";

  } else if (busO === bO) {

    boardingETA =
      "NOW";

  } else if (
    boardingRecord
  ) {

    boardingETA =
      formatMinutes(
        boardingRecord.eta_seconds
      );

  } else {

    boardingETA =
      "—";

  }


  const etaBoarding =
    document.getElementById(
      "eta-b"
    );


  if (etaBoarding) {

    etaBoarding.textContent =
      boardingETA;

  }


  /* -----------------------------------------
     DESTINATION ETA
  ----------------------------------------- */

  let destinationETA;


  if (busO > dO) {

    destinationETA =
      "ARRIVED";

  } else if (
    destinationRecord
  ) {

    destinationETA =
      formatMinutes(
        destinationRecord.eta_seconds
      ) +
      " min";

  } else {

    destinationETA =
      "—";

  }


  const etaDestination =
    document.getElementById(
      "eta-d"
    );


  if (etaDestination) {

    etaDestination.textContent =
      destinationETA;

  }


  /* -----------------------------------------
     SHOW ETA CARD
  ----------------------------------------- */

  const etaCard =
    document.getElementById(
      "eta-card"
    );


  if (etaCard) {

    etaCard.classList.add("show");

  }


  const noData =
    document.getElementById(
      "nodata"
    );


  if (noData) {

    noData.classList.remove("show");

  }

}


/* =========================================================
   FORMAT ETA
========================================================= */

function formatMinutes(
  seconds
) {

  const value =
    Number(seconds);


  if (!Number.isFinite(value)) {

    return "—";

  }


  if (value <= 45) {
    return "NOW";
  }
  if (value <= 90) {
    return "1";
  }


  return Math.ceil(
    value / 60
  );

}


/* =========================================================
   FIND STOP
========================================================= */

function findStopByOrder(
  order
) {

  return stops.find(
    function (stop) {

      return (
        Number(
          stop.stop_order
        ) ===
        Number(order)
      );

    }
  );

}


/* =========================================================
   HIDE ETA
========================================================= */

function hideETA() {

  const etaCard =
    document.getElementById(
      "eta-card"
    );

  if (etaCard) {

    etaCard.classList.remove(
      "show"
    );

  }


  const noData =
    document.getElementById(
      "nodata"
    );

  if (noData) {

    noData.classList.add(
      "show"
    );

  }


  const busAt =
    document.getElementById(
      "bus-at"
    );

  if (busAt) {

    busAt.textContent =
      "—";

  }


  const etaBoarding =
    document.getElementById(
      "eta-b"
    );

  if (etaBoarding) {

    etaBoarding.textContent =
      "—";

  }


  const etaDestination =
    document.getElementById(
      "eta-d"
    );

  if (etaDestination) {

    etaDestination.textContent =
      "—";

  }


  const labelBoarding =
    document.getElementById(
      "lbl-b"
    );

  if (labelBoarding) {

    labelBoarding.textContent =
      "—";

  }


  const labelDestination =
    document.getElementById(
      "lbl-d"
    );

  if (labelDestination) {

    labelDestination.textContent =
      "—";

  }

}


/* =========================================================
   NO DATA
========================================================= */

function showNoData() {

  const etaCard =
    document.getElementById(
      "eta-card"
    );

  if (etaCard) {

    etaCard.classList.remove(
      "show"
    );

  }


  const noData =
    document.getElementById(
      "nodata"
    );

  if (noData) {

    noData.classList.add(
      "show"
    );

  }

}


/* =========================================================
   RENDER ROUTE
========================================================= */

function renderRoute() {

  if (!stops.length) {

    return;

  }


  let html = "";


  stops.forEach(
    function (stop, index) {

      const order =
        Number(
          stop.stop_order
        );


      const last =
        index ===
        stops.length - 1;


      let dotClass =
        "node-dot";


      let nameClass =
        "node-name";


      let connectorClass =
        "node-connector";


      let tag = "";


      /* ---------------------------------------
         STOPS BEFORE BUS
      --------------------------------------- */

      if (
        busO > 0 &&
        order < busO
      ) {

        dotClass +=
          " past";


        connectorClass +=
          " past";

      }


      /* ---------------------------------------
         CURRENT BUS STOP
      --------------------------------------- */

      if (
        busO > 0 &&
        order === busO
      ) {

        dotClass +=
          " cur";


        nameClass +=
          " cur";


        tag =
          '<span class="node-tag bus">' +
          "🚌 BUS HERE" +
          "</span>";


        connectorClass +=
          " highlight";

      }


      /* ---------------------------------------
         BOARDING STOP
      --------------------------------------- */

      if (
        order === bO &&
        order !== busO
      ) {

        dotClass =
          "node-dot board";


        nameClass =
          "node-name board";


        tag =
          '<span class="node-tag you">' +
          "PICKUP" +
          "</span>";

      }


      /* ---------------------------------------
         BUS + BOARDING
      --------------------------------------- */

      if (
        order === bO &&
        order === busO
      ) {

        dotClass =
          "node-dot cur";


        nameClass =
          "node-name cur";


        tag =
          '<span class="node-tag bus">' +
          "🚌 BUS HERE · PICKUP" +
          "</span>";

      }


      /* ---------------------------------------
         DESTINATION
      --------------------------------------- */

      if (
        order === dO &&
        order !== busO
      ) {

        dotClass =
          "node-dot dest";


        nameClass =
          "node-name dest";


        tag =
          '<span class="node-tag dst">' +
          "DESTINATION" +
          "</span>";

      }


      /* ---------------------------------------
         NEXT STOP
      --------------------------------------- */

      if (
        busO > 0 &&
        order === busO + 1 &&
        order !== bO &&
        order !== dO
      ) {

        tag =
          '<span class="node-tag nxt">' +
          "APPROACHING" +
          "</span>";

      }


      /* ---------------------------------------
         NEXT STOP IS BOARDING
      --------------------------------------- */

      if (
        busO > 0 &&
        order === busO + 1 &&
        order === bO
      ) {

        tag =
          '<span class="node-tag nxt">' +
          "APPROACHING PICKUP" +
          "</span>";

      }


      /* ---------------------------------------
         NEXT STOP IS DESTINATION
      --------------------------------------- */

      if (
        busO > 0 &&
        order === busO + 1 &&
        order === dO
      ) {

        tag =
          '<span class="node-tag nxt">' +
          "APPROACHING DESTINATION" +
          "</span>";

      }


      html +=

        '<div class="node-row">' +

        '<div class="node-spine">' +

        '<div class="' +
        dotClass +
        '"></div>' +

        (
          !last
            ? '<div class="' +
              connectorClass +
              '"></div>'
            : ""
        ) +

        "</div>" +

        '<div class="node-data">' +

        '<div class="' +
        nameClass +
        '">' +

        escapeHTML(
          stop.stop_name
        ) +

        "</div>" +

        tag +

        "</div>" +

        "</div>";

    }
  );


  const routeList =
    document.getElementById(
      "rlist"
    );


  if (routeList) {

    routeList.innerHTML =
      html;

  }

}


/* =========================================================
   PASSENGER GPS
   TOGGLE
========================================================= */

function toggleGPS() {

  if (sharing) {

    stopGPS();

  } else {

    startGPS();

  }

}


/* =========================================================
   PASSENGER GPS
   START
========================================================= */

function startGPS() {

  if (!navigator.geolocation) {

    alert(
      "Geolocation is not supported by this phone/browser."
    );

    return;

  }


  const button =
    document.getElementById(
      "gps-btn"
    );


  const label =
    document.getElementById(
      "gps-lbl"
    );


  if (label) {

    label.textContent =
      "Requesting GPS...";

  }


  navigator.geolocation.getCurrentPosition(

    function (position) {

      sharing = true;


      if (button) {

        button.classList.add(
          "active"
        );

      }


      if (label) {

        label.textContent =
          "Broadcasting Location (Live)";

      }


      /*
        Send first GPS position immediately.
      */

      sendPing(
        position
      );


      /*
        Continue watching passenger
        location.
      */

      watchId =
        navigator.geolocation.watchPosition(

          function (newPosition) {

            sendPing(
              newPosition
            );

          },

          function (error) {

            console.warn(
              "GPS watch error:",
              error
            );

          },

          {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 15000
          }

        );

    },

    function (error) {

      console.warn(
        "GPS permission/error:",
        error
      );


      if (label) {

        label.textContent =
          "Broadcast My Location";

      }


      alert(
        "Please allow location access in your browser to broadcast GPS."
      );

    },

    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }

  );

}


/* =========================================================
   PASSENGER GPS
   SEND PING
========================================================= */

async function sendPing(
  position
) {

  try {

    /*
      Give each phone a persistent
      anonymous local identifier.
    */

    let deviceId =
      localStorage.getItem(
        "bmtc_id"
      );


    if (!deviceId) {

      deviceId =
        "phone-" +
        Math.random()
          .toString(36)
          .substring(2, 10);


      localStorage.setItem(
        "bmtc_id",
        deviceId
      );

    }


    const body = {

      device_id:
        deviceId,

      direction_id:
        dir,

      from_stop_order:
        bO || 0,

      lat:
        position.coords.latitude,

      lng:
        position.coords.longitude,

      speed_mps:
        position.coords.speed || 0,

      heading:
        position.coords.heading || 0,

      timestamp:
        new Date().toISOString()

    };


    console.log(
      "Sending passenger GPS:",
      body
    );


    const response =
      await fetch(
        API + "/ping",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(body)
        }
      );


    if (!response.ok) {

      console.error(
        "GPS broadcast failed:",
        response.status
      );

      return;

    }


    const result =
      await response.json();


    console.log(
      "GPS broadcast accepted:",
      result
    );


  } catch (error) {

    console.error(
      "GPS broadcast error:",
      error
    );

  }

}


/* =========================================================
   PASSENGER GPS
   STOP
========================================================= */

function stopGPS() {

  if (watchId !== null) {

    navigator.geolocation.clearWatch(
      watchId
    );


    watchId =
      null;

  }


  sharing =
    false;


  const button =
    document.getElementById(
      "gps-btn"
    );


  const label =
    document.getElementById(
      "gps-lbl"
    );


  if (button) {

    button.classList.remove(
      "active"
    );

  }


  if (label) {

    label.textContent =
      "Broadcast My Location";

  }


  console.log(
    "Passenger GPS stopped."
  );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
  value
) {

  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}