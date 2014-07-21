//set moment.js i18n
moment.lang("en");

angular.module('app', [
  'ngResource',
  'ngCookies',
  'ngRoute',
  'owork.calendar'
]);

angular.module('calendar')
  .value('calendarConfig', { step: 30, workTime: [9, 18], moveEvents: false });

angular.module('app').value('$user',
  {
    "id":"53a435ffe4b0661cd64df3be",
    "full_name": "Tyrion Lannister",
    "last_name": "Lannister",
    "first_name": "Tyrion",
    "position": null,
    "departament": null,
    "status": {
      "status": 0
    },
    "avatar_50_url": "http://st.kp.yandex.net/images/sm_actor/1906.jpg"
  }
);