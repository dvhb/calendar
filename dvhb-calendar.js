/*! dvhb-calendar - v0.2.0 - 2014-07-10
 * Copyright (c) 2014 Alexey Subbotenko <asu@dvhb.ru>;
 * Licensed 
 */
angular.module('owork.calendar', [
    'common.api',
    'calendar'
  ])

  .constant('MONGOLAB_CONFIG', {
    dbName: 'owork-calendar',
    apiKey: 'WB5ZDewHyirIssJSIylEHfljGaczWmYp'
  })

  .config(function(MONGOLAB_CONFIG, RestangularProvider) {
    RestangularProvider.setBaseUrl('https://api.mongolab.com/api/1/databases/' + MONGOLAB_CONFIG.dbName + '/collections');
    RestangularProvider.setDefaultRequestParams({ apiKey: MONGOLAB_CONFIG.apiKey });
    RestangularProvider.setRestangularFields({
      id: '_id.$oid'
    });

    RestangularProvider.setRequestInterceptor(function(elem, operation, what) {
      if (operation === 'put') {
        elem._id = undefined;
        return elem;
      }
      return elem;
    });

    RestangularProvider.setResponseExtractor(function(response, operation, what, url) {
      if (operation === "getList") {
        if (angular.isArray(response)) {
          var newResponse = [];
          angular.forEach(response, function(item) {
            item.id = item._id.$oid;
            //delete item._id;
            newResponse.push(item);
          }, newResponse);

          response = newResponse;
        }
      }

      if (angular.isObject(response) && response._id && response._id.$oid) {
        response.id = response._id.$oid;
        //delete response._id;
      }
      return response;
    });

  })
;
(function() {
  angular.module("calendar", ["calendar.popup", "calendar.months", "calendar.week", "calendar/calendar.tpl.html"]);

  angular.module("calendar").factory("CalendarData", function() {
    return {
      activeDay: {}
    };
  });

  angular.module("calendar").value("calendarConfig", {
    step: 30,
    workTime: [9, 18],
    moveEvents: false
  });

  angular.module('calendar').filter("plural", function() {
    return function(n, forms) {
      forms = forms.split(',');
      n %= 100;
      if (n > 10 && n < 20) {
        return forms[2];
      }
      n %= 10;
      if (n > 1 && n < 5) {
        return forms[1];
      }
      if (n === 1) {
        return forms[0];
      }
      return forms[2];
    };
  });

  angular.module('calendar').filter("isAcceptedEvent", function($user) {
    return function(event) {
      var isAcceptedEvent;
      isAcceptedEvent = true;
      if (angular.isArray(event.members)) {
        angular.forEach(event.members, function(member) {
          if (member.id === $user.id && !member.is_invitation_accepted) {
            isAcceptedEvent = false;
          }
        });
      }
      return isAcceptedEvent;
    };
  });

  angular.module("calendar").filter("capitalize", function() {
    return function(input) {
      return input.charAt(0).toUpperCase() + input.slice(1);
    };
  });

  moment.lang(moment.lang(), {
    week: {
      dow: 1,
      doy: 7
    }
  });

}).call(this);

(function() {
  angular.module("calendar.months", ["calendar/months/index.tpl.html", "calendar/months/months.tpl.html"]);

  angular.module("calendar.months").directive("ngHtml", function() {
    return function(scope, element, attrs) {
      return scope.$watch(attrs.ngHtml, function(value) {
        element[0].innerHTML = value;
      });
    };
  });

  angular.module("calendar.months").directive("calendar", function(calendarConfig, $user, $filter) {
    return {
      restrict: "E",
      scope: {
        assignedMonth: "=calendarMonth",
        assignedyear: "=calendarYear",
        activeDay: "=",
        events: "="
      },
      templateUrl: "calendar/months/months.tpl.html",
      link: function(scope, element) {
        var daysInMonth, init, monthInit, renderEvents, weekInit;
        init = function() {
          var weekdays;
          weekdays = function() {
            var sunday;
            weekdays = moment.weekdays();
            sunday = weekdays[0];
            weekdays.splice(0, 1);
            weekdays.push(sunday);
            return weekdays;
          };
          scope.weekdays = weekdays();
          scope.month = monthInit(scope.currentDate.getMonth() + 1, scope.currentDate.getFullYear());
          if (scope.events) {
            renderEvents(scope.events);
          }
        };
        daysInMonth = function(month, year) {
          return new Date(year, month, 0).getDate();
        };
        monthInit = function(month, year) {
          var atDay, atWeek, daysOfMonth, firstDay, firstDayInFirstweek, monthArray, prevDaysOfMonth, recordDate;
          monthArray = [];
          firstDay = new Date(year, month - 1, 1, 0, 0, 0, 0);
          firstDayInFirstweek = (firstDay.getDay() > 0 ? firstDay.getDay() : 7);
          daysOfMonth = daysInMonth(month, year);
          prevDaysOfMonth = daysInMonth(month - 1, year);
          recordDate = 0;
          monthArray.push(weekInit(year, month, recordDate - firstDayInFirstweek, daysOfMonth, prevDaysOfMonth));
          recordDate = 7 - firstDayInFirstweek;
          while (recordDate < daysOfMonth - 1) {
            monthArray.push(weekInit(year, month, recordDate, daysOfMonth));
            recordDate += 7;
          }
          if (scope.currentDate.getMonth() === scope.today.getMonth() && scope.currentDate.getFullYear() === scope.today.getFullYear()) {
            atWeek = Math.ceil((scope.today.getDate() + firstDayInFirstweek - 1) / 7) - 1;
            atDay = (scope.today.getDate() + firstDayInFirstweek - 2) % 7;
            monthArray[atWeek][atDay].isToday = true;
          }
          return monthArray;
        };
        weekInit = function(year, month, startDate, daysOfMonth, prevDaysOfMonth) {
          var day, i, obj, outmonth, week;
          week = [];
          i = 1;
          while (i <= 7) {
            day = void 0;
            outmonth = false;
            if (startDate + i < 0) {
              day = prevDaysOfMonth + startDate + i + 1;
              outmonth = true;
            } else if (startDate + i + 1 > daysOfMonth) {
              day = startDate + i - daysOfMonth + 1;
              outmonth = true;
            } else {
              day = startDate + i + 1;
            }
            obj = {
              outmonth: outmonth,
              dayIndex: i,
              day: day,
              date: new Date(year, month - 1, day),
              events: []
            };
            week.push(obj);
            i++;
          }
          return week;
        };
        renderEvents = function(events) {
          if (!angular.isArray(scope.month)) {
            return;
          }
          scope.month.forEach(function(week, i) {
            week.forEach(function(day, j) {
              scope.month[i][j].events = [];
              scope.month[i][j].eventsLoad = function() {
                var loadsMs, p;
                p = 0;
                loadsMs = 0;
                angular.forEach(this.events, function(e, key) {
                  var eventHour;
                  eventHour = moment(e.start).hours();
                  if (eventHour >= calendarConfig.workTime[0] && eventHour < calendarConfig.workTime[1]) {
                    loadsMs += moment(e.end).diff(moment(e.start));
                  }
                });
                if (loadsMs) {
                  p = (100 * loadsMs) / ((calendarConfig.workTime[1] - calendarConfig.workTime[0] + 1) * 3600000);
                }
                return p;
              };
              scope.month[i][j].getNotAccepted = function() {
                var notAcceptedEvents;
                notAcceptedEvents = [];
                if (angular.isArray(this.events)) {
                  angular.forEach(this.events, function(event) {
                    if (!$filter('isAcceptedEvent')(event)) {
                      notAcceptedEvents.push(event);
                    }
                  });
                }
                return notAcceptedEvents;
              };
              scope.month[i][j].eventsLoadHeight = function() {
                return this.eventsLoad() + "%";
              };
              scope.month[i][j].eventsLoadOpacity = function() {
                return this.eventsLoad() / 100 + 0.3;
              };
              events.forEach(function(e) {
                var calendarDate, diff, eventDate;
                eventDate = moment(e.start, "YYYY-MM-DD");
                calendarDate = moment(day.date);
                diff = calendarDate.diff(eventDate, "days");
                if (!diff) {
                  scope.month[i][j].events.push(e);
                }
              });
            });
          });
        };
        scope.$watch("events", (function(newVal) {
          if (newVal) {
            renderEvents(newVal);
          }
        }), true);
        scope.$watch("assignedMonth", function(newVal, oldVal) {
          var refreshCalendar, targetMonth, targetYear;
          targetMonth = parseInt(scope.assignedMonth, 10);
          targetYear = parseInt(scope.assignedyear, 10);
          if (!isNaN(targetMonth) && !isNaN(targetYear) && targetMonth >= 0 && targetMonth <= 12) {
            scope.currentDate = new Date(targetYear, targetMonth, 0);
          } else {
            scope.currentDate = new Date();
          }
          scope.today = new Date();
          scope.navigate = {};
          scope.changeActiveDay = function() {
            if (this.day.outmonth) {
              return false;
            }
            scope.month.forEach(function(week, i) {
              week.forEach(function(day, j) {
                scope.month[i][j].active = false;
              });
            });
            if (scope.activeDay) {
              scope.activeDay.active = false;
            }
            scope.activeDay = this.day;
            this.day.active = true;
          };
          scope.navigate.prevMonth = function() {
            scope.currentDate.setMonth(scope.currentDate.getMonth() - 1);
            refreshCalendar();
          };
          scope.navigate.nextMonth = function() {
            scope.currentDate.setMonth(scope.currentDate.getMonth() + 1);
            refreshCalendar();
          };
          scope.navigate.thisMonth = function() {
            scope.currentDate = new Date();
            refreshCalendar();
          };
          refreshCalendar = function() {
            return init();
          };
          refreshCalendar();
        });
      }
    };
  });

  angular.module("calendar.months").controller("CalendarMonthCtrl", function($scope, CalendarData) {
    var refreshCalendar;
    $scope.currentDate = new Date();
    $scope.calendarData = CalendarData;
    refreshCalendar = function() {
      var currentDate, nextDate;
      currentDate = moment($scope.currentDate);
      nextDate = moment($scope.currentDate).add("M", 1);
      $scope.currentYear = parseInt(currentDate.format("YYYY"), 10);
      $scope.currentMonth = parseInt(currentDate.format("M"), 10);
      $scope.nextMonth = parseInt(nextDate.format("M"), 10);
      $scope.nextYear = parseInt(nextDate.format("YYYY"), 10);
    };
    refreshCalendar();
    $scope.navigate = {
      prevMonth: function() {
        $scope.currentDate.setMonth($scope.currentDate.getMonth() - 1);
        refreshCalendar();
      },
      nextMonth: function() {
        $scope.currentDate.setMonth($scope.currentDate.getMonth() + 1);
        refreshCalendar();
      }
    };
    $scope.currentMonthFormatted = function(currentMonth) {
      return moment().month(currentMonth - 1).format("MMMM");
    };
    $scope.nextMonthFormatted = function(nextMonth) {
      return moment().month(nextMonth - 1).format("MMMM");
    };
  });

}).call(this);

(function() {
  angular.module("calendar.popup", ["calendar/popup/event.view.tpl.html", "calendar/popup/event.edit.tpl.html", "directives.autocomplete"]);

  angular.module("calendar.popup").config(function($routeProvider) {
    $routeProvider.when("/event/:eventId/view", {
      templateUrl: "calendar/popup/event.view.tpl.html",
      controller: "PopupEventViewCtrl",
      resolve: {
        currentEvent: function(Events, $route) {
          return Events.getOne($route.current.params.eventId);
        }
      }
    }).when("/event/:eventId/edit", {
      templateUrl: "calendar/popup/event.edit.tpl.html",
      controller: "PopupEventEditCtrl",
      resolve: {
        currentEvent: function(Events, $route, $eventPopup) {
          if ($eventPopup.event && $eventPopup.event.id) {
            return $eventPopup.event;
          } else {
            return Events.getOne($route.current.params.eventId);
          }
        }
      }
    }).when("/create/:eventStart/:eventEnd", {
      templateUrl: "calendar/popup/event.edit.tpl.html",
      controller: "PopupEventEditCtrl",
      resolve: {
        currentEvent: function($eventPopup, $route) {
          return $eventPopup.create($route.current.params.eventStart, $route.current.params.eventEnd);
        }
      }
    }).otherwise({
      redirectTo: "/"
    });
  });

  angular.module("calendar.popup").service("$eventPopup", function($filter, $rootScope, $location, $user) {
    var that;
    that = this;
    this.width = 380;
    this.event = {};
    this.currentUser = $user;
    this.isNewEvent = function() {
      if (!that.event.id) {
        return true;
      }
    };
    this.isActive = function(event) {
      return that.event.id === event.id;
    };
    this.isPopupLeft = function() {
      var weekday;
      if (typeof that.event === "object") {
        weekday = parseInt(moment(that.event.start).format('d'), 10);
        if (weekday > 4 || weekday === 0) {
          return true;
        }
      }
    };
    this.isPopupRight = function() {
      var weekday;
      if (typeof that.event === "object") {
        weekday = parseInt(moment(that.event.start).format('d'), 10);
        if (weekday <= 4 && weekday !== 0) {
          return true;
        }
      }
    };
    this.getLeft = function() {
      var eventWidth, eventleft, isLeft, isRight, refColumn;
      if (!that.event.start) {
        return;
      }
      refColumn = $('[data-weekday="' + moment(that.event.start).format('d') + '"]');
      eventleft = refColumn.position().left;
      eventWidth = refColumn.width() + 1;
      isLeft = that.isPopupLeft();
      isRight = that.isPopupRight();
      if (isLeft) {
        return eventleft - that.width - 15;
      }
      if (isRight) {
        return eventleft + eventWidth + 15;
      }
    };
    this.getTop = function() {
      var refRow, top;
      if (!that.event.start) {
        return;
      }
      refRow = $('[data-hour="' + moment(that.event.start).format('H') + '"]');
      top = (refRow.position().top) + Math.round((refRow.outerHeight() / 60) * moment(that.event.start).format('mm'));
      return top;
    };
    this.getOne = function() {
      return that.event;
    };
    this.create = function(eventStart, eventEnd) {
      return that.event = {
        author: that.currentUser,
        name: "",
        start: eventStart,
        end: eventEnd
      };
    };
    this.destroy = function() {
      $rootScope.$broadcast("eventPopup.destroy", that.event);
      that.event = {};
      $location.path("/");
    };
    this.edit = function(eventId) {
      $location.path("event/" + eventId + "/edit");
    };
    this.isEditable = function() {
      if (that.event && that.event.author) {
        return that.event.author.id === $user.id;
      }
    };
    this.isAcceptedEvent = function(event) {
      var isAcceptedEvent;
      if (!event) {
        event = that.event;
      }
      isAcceptedEvent = $filter('isAcceptedEvent')(event);
      return isAcceptedEvent;
    };
  });

  angular.module("calendar.popup").directive("scrollToPopup", function($timeout) {
    return {
      link: function(scope, element, attr) {
        $timeout(function() {
          return $("html, body").animate({
            scrollTop: element.offset().top - 100
          }, 1000);
        });
      }
    };
  });

  angular.module("calendar.popup").directive("popupPosition", function($timeout, $eventPopup) {
    return {
      link: function(scope, element, attr) {
        if ($(".trip-overlay").length) {
          element.css("z-index", "inherit");
        } else {
          element.css("z-index", "1001");
        }
        element.css("left", $eventPopup.getLeft());
        element.css("top", $eventPopup.getTop());
        if ($eventPopup.isPopupLeft()) {
          element.addClass("CalendarPopupRight", $eventPopup.isPopupLeft());
        }
        if ($eventPopup.isPopupRight()) {
          element.addClass("CalendarPopupLeft", $eventPopup.isPopupRight());
        }
      }
    };
  });

  angular.module("calendar.popup").directive("dateToTime", function() {
    return {
      restrict: "A",
      require: "ngModel",
      link: function(scope, element, attr, ngModel) {
        var fromUser, toUser;
        fromUser = function(time) {
          var currentDate, date, hour, minutes;
          if (time !== undefined) {
            currentDate = attr.currentDate;
            hour = parseInt(time.split(":")[0], 10);
            minutes = parseInt(time.split(":")[1], 10);
            date = moment(currentDate).hour(hour).minutes(minutes).format();
            return date;
          }
        };
        toUser = function(date) {
          var time;
          attr.currentDate = date;
          if (date !== undefined) {
            time = moment(date).format("HH") + ":" + moment(date).format("mm");
            return time;
          }
        };
        ngModel.$parsers.push(fromUser);
        ngModel.$formatters.push(toUser);
      }
    };
  });

  angular.module("calendar.popup").filter("membersAccepted", function() {
    return function(items, isAccepted) {
      var arr, i;
      arr = [];
      if (angular.isArray(items)) {
        i = 0;
        while (i < items.length) {
          if (items[i].is_invitation_accepted === isAccepted) {
            arr.push(items[i]);
          }
          i++;
        }
      }
      return arr;
    };
  });

  angular.module("calendar.popup").controller("CalendarCtrl", function($scope, Events, $cookieStore) {
    if (!Events.events.length) {
      Events.getList().then(function(data) {
        return $scope.events = data;
      });
    }
    $scope.showMonthCalendar = true;
    if ($cookieStore.get("showMonthCalendar") !== undefined) {
      $scope.showMonthCalendar = $cookieStore.get("showMonthCalendar");
    }
    $scope.$watch("showMonthCalendar", function(newVal) {
      $cookieStore.put("showMonthCalendar", newVal);
    });
  });

  angular.module("calendar.popup").controller("PopupEventViewCtrl", function($rootScope, $scope, $eventPopup, Events, $http, $filter, currentEvent, $location, $user) {
    $rootScope.$broadcast('eventPopup.view', currentEvent);
    $scope.$eventPopup = $eventPopup;
    $scope.showAutocomplete = false;
    if (currentEvent) {
      $eventPopup.event = currentEvent;
    }
    $scope.event = $eventPopup.getOne();
    $scope.$watch("event.members", (function(members) {
      $scope.notAcceptedMembers = $filter("membersAccepted")(members, false);
      return $scope.acceptedMembers = $filter("membersAccepted")(members, true);
    }), true);
    $scope.edit = function() {
      $eventPopup.edit($scope.event.id);
    };
    $scope.cancel = function() {
      $eventPopup.destroy();
    };
    $scope.acceptEvent = function() {
      var event_id, member_id;
      member_id = $user.id;
      event_id = $scope.event.id;
      Events.acceptMember(event_id, member_id).then(function(updatedEvent) {
        $scope.event = updatedEvent;
        $eventPopup.event = updatedEvent;
      });
    };
    $scope.refuseEvent = function(showAlert) {
      var refuse;
      refuse = function() {
        var event_id, member_id;
        member_id = $user.id;
        event_id = $scope.event.id;
        Events.refuseMember(event_id, member_id).then(function() {
          $scope.cancel();
          return $rootScope.$broadcast('eventPopup.refuseEvent');
        });
      };
      refuse();
    };
    $scope.newMembers = [];
    $scope.$watch("newMembers", function(new_members) {
      if (angular.isArray(new_members) && new_members.length) {
        return Events.inviteMembers($scope.event.id, new_members).then(function() {
          return $scope.showAutocomplete = false;
        });
      }
    }, true);
  });

  angular.module("calendar.popup").controller("PopupEventEditCtrl", function($scope, $eventPopup, Events, $http, $filter, currentEvent, $location, $user) {
    $scope.$eventPopup = $eventPopup;
    if (currentEvent) {
      $eventPopup.event = currentEvent;
    }
    $scope.event = angular.copy($eventPopup.event);
    $scope.$watch("event.members", (function(members) {
      $scope.notAcceptedMembers = $filter("membersAccepted")(members, false);
      return $scope.acceptedMembers = $filter("membersAccepted")(members, true);
    }), true);
    $scope.date_start = moment($scope.event.start).format("L");
    $scope.$watch("date_start", function(val) {
      var dateEnd, dateStart;
      if (angular.isDefined(val) && val) {
        dateStart = $scope.event.start;
        dateEnd = $scope.event.end;
        $scope.event.start = moment(val, "DD-MM-YYYY").hour(moment(dateStart).format("HH")).minutes(moment(dateStart).format("mm")).format();
        $scope.event.end = moment(val, "DD-MM-YYYY").hour(moment(dateEnd).format("HH")).minutes(moment(dateEnd).format("mm")).format();
      }
    });
    $scope.submit = function() {
      var event;
      event = $scope.event;
      $scope.myForm.$setValidity("wrong_interval", true);
      $scope.myForm.$setValidity("duplicate", true);
      Events.events.forEach(function(e) {
        if (e.start === event.start && !event.id) {
          return $scope.myForm.$setValidity("duplicate", false);
        }
      });
      if (moment(event.end).diff(moment(event.start), 'minutes') < 30) {
        $scope.myForm.$setValidity("wrong_interval", false);
      }
      if (!$scope.myForm.$invalid) {
        $scope.loading = true;
        if (event.id) {
          Events.update(event).then(function() {
            $scope.cancel();
            return $scope.loading = false;
          });
        } else {
          Events.createEvent(event).then(function() {
            $scope.cancel();
            return $scope.loading = false;
          });
          return;
        }
      }
    };
    $scope.cancel = function() {
      $eventPopup.destroy();
    };
    $scope.remove = function(eventId) {
      Events.remove(eventId).then(function() {
        return $eventPopup.destroy();
      });
    };
    $scope.showAutocomplete = true;
    $scope.event.membersForInvite = [];
    $scope.event.membersForRemove = [];
    $scope.newMembers = [];
    $scope.$watch("newMembers", function(new_members) {
      if (angular.isArray(new_members) && new_members.length) {
        return $scope.event.membersForInvite = $scope.event.membersForInvite.concat(new_members);
      }
    }, true);
    $scope.removeMember = function(removedMember) {
      return angular.forEach($scope.event.members, function(member, index) {
        if (removedMember.id === member.id) {
          $scope.event.members.splice(index, 1);
          return $scope.event.membersForRemove.push(member);
        }
      });
    };
    $scope.inputImportantFields = function() {
      var form;
      form = $scope.myForm;
      return form.name.$valid && !form.time_start.$error.required && !form.time_end.$error.required && form.date_start.$valid;
    };
  });

}).call(this);

(function() {
  angular.module("calendar.week", ["calendar/week/index.tpl.html", "calendar/week/timeline.tpl.html", "calendar/week/event.tpl.html", "directives.ellipsis"]);

  angular.module("calendar.week").factory("$timeline", function(calendarConfig) {
    return {
      workTimeInterval: calendarConfig.workTime,
      notWorkingTime1: function() {
        var i, time;
        time = [];
        i = 0;
        while (i < this.workTimeInterval[0]) {
          time.push(i);
          i++;
        }
        return time;
      },
      workingTime: function() {
        var i, time;
        time = [];
        i = this.workTimeInterval[0];
        while (i <= this.workTimeInterval[1]) {
          time.push(i);
          i++;
        }
        return time;
      },
      notWorkingTime2: function() {
        var i, time;
        time = [];
        i = this.workTimeInterval[1] + 1;
        while (i <= 23) {
          time.push(i);
          i++;
        }
        return time;
      }
    };
  });

  angular.module("calendar.week").controller("CalendarWeekCtrl", function($rootScope, $scope, $http, mouse, calendarConfig, $filter, CalendarData, $timeline, $eventPopup, $location, $user) {
    $scope.$eventPopup = $eventPopup;
    $scope.$user = $user;
    $scope.calendarData = CalendarData;
    $scope.view = {
      start: moment().startOf('week'),
      end: moment().endOf('week')
    };
    $scope.timeline = $timeline;
    $scope.calendarConfig = calendarConfig;
    $scope.$watch("calendarData.activeDay.date", function(newVal) {
      var date, weekEnd, weekStart;
      if (newVal) {
        date = moment(newVal);
        weekStart = void 0;
        weekEnd = void 0;
        weekStart = (date.format("d") !== "0" ? date.startOf("week").day(+1) : date.day(-1).startOf("week").day(+1));
        weekEnd = moment(weekStart).day(+7);
        $scope.view.start = weekStart;
        $scope.view.end = weekEnd;
        $scope.openNotWorkingTimeWithEvents();
      }
    });
    window.onresize = function() {
      $scope.$apply();
    };
    $scope.switchDate = function(val) {
      $scope.view.start = moment($scope.view.start).add("d", val);
      $scope.view.end = moment($scope.view.end).add("d", val);
    };
    $scope.weekDayFormatted = function(weekday) {
      return moment($scope.view.start).add("d", weekday).format("D MMMM");
    };
    $scope.getEventRow = function(event) {
      if (event) {
        return $("[data-hour=\"" + moment(event.start).format("H") + "\"]");
      }
    };
    $scope.getEventColumn = function(event) {
      if (event) {
        return $("[data-weekday=\"" + moment(event.start).format("d") + "\"]");
      }
    };
    $scope.getEventHeight = function(event) {
      var dx, minutes, refRow, rowHeight;
      if (event) {
        refRow = $scope.getEventRow(event);
        rowHeight = refRow.outerHeight();
        minutes = moment(event.end).diff(moment(event.start), "minutes");
        dx = Math.ceil(minutes / 60) - 1;
        return ((rowHeight / 60) * minutes) + dx;
      }
    };
    $scope.getEventWidth = function(currentEvent) {
      var eventWidth, events, refColumn, zIndex;
      if (currentEvent) {
        refColumn = $scope.getEventColumn(currentEvent);
        eventWidth = refColumn.width() + 1;
        events = $scope.events;
        zIndex = $scope.getEventZindex(currentEvent, events);
        if (zIndex) {
          eventWidth -= 20;
        }
        return eventWidth;
      }
    };
    $scope.getEventTop = function(event) {
      var refRow;
      refRow = $scope.getEventRow(event);
      if (event && refRow.length) {
        return (refRow.position().top) + Math.round((refRow.outerHeight() / 60) * moment(event.start).format("mm"));
      }
    };
    $scope.getEventZindex1 = function(event) {
      if ($eventPopup.isActive(event)) {
        return 1001 + event.zIndex;
      } else {
        return event.zIndex;
      }
    };
    $scope.getEventZindex = function(currentEvent) {
      var events, eventsInThisDay, zIndex;
      events = $scope.events;
      zIndex = 0;
      eventsInThisDay = $filter("getEventByDay")(events, currentEvent.start);
      angular.forEach(eventsInThisDay, function(e) {
        if (e.id !== currentEvent.id) {
          if ((new Date(currentEvent.start) < new Date(e.end)) && (new Date(currentEvent.start) > new Date(e.start))) {
            zIndex = 1;
          }
          if ((new Date(currentEvent.start) > new Date(e.start)) && (new Date(currentEvent.end) < new Date(e.end))) {
            zIndex = 2;
          }
          if ((new Date(currentEvent.start).valueOf() === new Date(e.start).valueOf()) && (new Date(currentEvent.end).valueOf() === new Date(e.end).valueOf()) && !e.alreadyMoved) {
            currentEvent.alreadyMoved = true;
            zIndex = 3;
          }
        }
      });
      return zIndex;
    };
    $scope.getEventLeft = function(currentEvent) {
      var events, positionLeft, refColumn, zIndex;
      refColumn = $scope.getEventColumn(currentEvent);
      positionLeft = 0;
      events = $scope.events;
      if (currentEvent && refColumn.length) {
        positionLeft = refColumn.position().left;
        zIndex = $scope.getEventZindex(currentEvent, events);
        if (zIndex) {
          positionLeft += 20;
        }
        currentEvent.zIndex = zIndex;
        return positionLeft;
      }
    };
    $scope.resizeEventObj = null;
    $scope.resizeDelta = 0;
    $scope.resizeEvent = function() {
      $rootScope.$broadcast("events.onClick", this);
      if (!calendarConfig.moveEvents) {
        return;
      }
      $scope.resizeEventObj = this.event;
      $scope.resizeDelta = 0;
    };
    $scope.getTimelineTop = function() {
      var refRow, top;
      refRow = $("[data-hour=\"" + moment().format("H") + "\"]");
      top = 0;
      if (refRow.length) {
        if (moment().format("H") === 0 && moment().format("mm") === 0) {
          top = refRow.position().top + 2;
        } else {
          top = (refRow.position().top) + Math.round((refRow.outerHeight() / 60) * moment().format("mm"));
        }
        return top - 1;
      }
    };
    $scope.isActualWeek = function(date) {
      var diff;
      diff = -1;
      if (date) {
        diff = moment(date).diff(moment($scope.view.start), "days");
      } else {
        diff = moment().diff(moment($scope.view.start), "days");
      }
      return diff >= 0 && diff <= 7;
    };
    $scope.isActualHour = function(hour) {
      return $scope.isActualWeek() === true && moment().format("H") === hour;
    };
    $scope.openNotWorkingTimeWithEvents = function() {
      $scope.showNotWorkingTime1 = false;
      $scope.showNotWorkingTime2 = false;
      $scope.events.forEach(function(event) {
        var h, isInWeek;
        isInWeek = $scope.isInWeek(event);
        if (isInWeek) {
          h = parseInt(moment(event.start).format("H"), 10);
          if ($timeline.notWorkingTime1().indexOf(h) !== -1) {
            $scope.showNotWorkingTime1 = true;
          }
          if ($timeline.notWorkingTime2().indexOf(h) !== -1) {
            $scope.showNotWorkingTime2 = true;
          }
        }
      });
    };
    $scope.isInWeek = function(event) {
      var diff;
      diff = moment(event.start).startOf("day").diff(moment($scope.view.start).startOf("day"), "days");
      return diff >= 0 && diff < 7;
    };
    $scope.isVisibleTime = function(event) {
      var refRow;
      refRow = $scope.getEventRow(event);
      return refRow.length;
    };
    $scope.isToday = function(day) {
      return $scope.isActualWeek() === true && moment().format("d") - 1 === day;
    };
    $scope.moveEventObj = null;
    $scope.moveDelta = 0;
    $scope.moveEvent = function(event) {
      $rootScope.$broadcast("events.onClick", event);
      if (!calendarConfig.moveEvents) {
        return;
      }
      $scope.moveEventObj = event;
      $scope.moveDelta = 0;
    };
    $scope.mousemove = function() {
      var colWidth, newEnd, newEndDelta, newEndRow, newStart, newStartDelta, newStartRow, refColumn, refRow, rowHeight;
      if (!calendarConfig.moveEvents) {
        return;
      }
      refRow = $scope.getEventRow($scope.moveEventObj);
      rowHeight = refRow.outerHeight() / 2;
      newStart = void 0;
      newStartRow = void 0;
      newEnd = void 0;
      newEndRow = void 0;
      if ($scope.resizeEventObj != null) {
        $scope.resizeDelta += mouse.getLocation().y - mouse.getPreviousLocation().y;
        if ($scope.resizeDelta > rowHeight || $scope.resizeDelta < -rowHeight) {
          newStart = moment($scope.moveEventObj.start);
          newEndDelta = Math.round($scope.resizeDelta / rowHeight) * calendarConfig.step;
          newEnd = moment($scope.resizeEventObj.end).add("m", newEndDelta);
          newEndRow = $scope.getEventRow({
            start: moment(newEnd).subtract("minute", 30)
          });
          if (newEndRow.length && newEnd.diff(newStart, "minutes")) {
            $scope.resizeEventObj.end = newEnd;
          }
          $scope.resizeDelta = 0;
        }
      } else if ($scope.moveEventObj != null) {
        $scope.moveDelta += mouse.getLocation().y - mouse.getPreviousLocation().y;
        if ($scope.moveDelta > rowHeight || $scope.moveDelta < -rowHeight) {
          newStartDelta = Math.round($scope.moveDelta / rowHeight) * calendarConfig.step;
          newStart = moment($scope.moveEventObj.start).add("m", newStartDelta);
          newEndDelta = Math.round($scope.moveDelta / rowHeight) * calendarConfig.step;
          newEnd = moment($scope.moveEventObj.end).add("m", newEndDelta);
          newStartRow = $scope.getEventRow({
            start: newStart
          });
          newEndRow = $scope.getEventRow({
            start: moment(newEnd).subtract("minute", 30)
          });
          if (newStartRow.length && newEndRow.length) {
            $scope.moveEventObj.start = newStart;
            $scope.moveEventObj.end = newEnd;
          }
          $scope.moveDelta = 0;
        }
        refColumn = $scope.getEventColumn($scope.moveEventObj);
        colWidth = refColumn.outerWidth();
        if (refColumn.length) {
          if (mouse.getLocation().x < refColumn.offset().left && refColumn.index() > 1) {
            $scope.moveEventObj.start = moment($scope.moveEventObj.start).subtract("d", 1);
            $scope.moveEventObj.end = moment($scope.moveEventObj.end).subtract("d", 1);
          }
          if (mouse.getLocation().x > (refColumn.offset().left + colWidth) && refColumn.index() < 7) {
            $scope.moveEventObj.start = moment($scope.moveEventObj.start).add("d", 1);
            $scope.moveEventObj.end = moment($scope.moveEventObj.end).add("d", 1);
          }
        }
      }
    };
    $scope.eventView = function(event) {
      $location.path("event/" + event.id + "/view");
    };
    $scope.isEventAcceptedAll = function(event) {
      var allAccepted;
      allAccepted = true;
      if (angular.isArray(event.members)) {
        angular.forEach(event.members, function(member) {
          if (!member.is_invitation_accepted) {
            allAccepted = false;
          }
        });
      }
      return allAccepted;
    };
    $scope.isNewEvent = function(event, user) {
      var isNewEvent;
      isNewEvent = false;
      if (angular.isArray(event.members)) {
        angular.forEach(event.members, function(member) {
          if (member.id === user.id && !member.is_invitation_accepted) {
            isNewEvent = true;
          }
        });
      }
      return isNewEvent;
    };
    $scope.createEmptyEventOnCell = function(time, weekday) {
      var end, eventStart, start;
      eventStart = moment($scope.view.start).startOf("day").add("h", time).add("d", weekday);
      start = eventStart.format();
      end = eventStart.add("h", 1).format();
      $location.path("create/" + start + "/" + end);
    };
    $scope.mouseup = function() {
      $scope.resizeEventObj = null;
      $scope.moveEventObj = null;
    };
    $scope.showNotWorkingTime = function(index) {
      if (index === 1) {
        $scope.showNotWorkingTime1 = !$scope.showNotWorkingTime1;
      }
      if (index === 2) {
        return $scope.showNotWorkingTime2 = !$scope.showNotWorkingTime2;
      }
    };
  });

  angular.module("calendar.week").filter("getEventByDay", function() {
    return function(events, startDate) {
      var arr;
      arr = [];
      angular.forEach(events, function(e) {
        var diff;
        diff = moment(e.start).startOf("day").diff(moment(startDate).startOf("day"), "days");
        if (diff === 0) {
          arr.push(e);
        }
      });
      return arr;
    };
  });

  angular.module("calendar.week").filter("dateFilter", function() {
    return function(input, format) {
      return moment(input).format(format || "LL");
    };
  });

  angular.module("calendar.week").filter("timelineWeek", function() {
    return function(startDate, weekday) {
      var string;
      string = moment(startDate).add("d", weekday).format("dddd");
      return string.charAt(0).toUpperCase() + string.slice(1);
    };
  });

  angular.module("calendar.week").filter("timelineDay", function() {
    return function(startDate, weekday) {
      return moment(startDate).add("d", weekday).format("D MMMM");
    };
  });

  angular.module("calendar.week").factory("mouse", function() {
    var api, location, previousLocation;
    location = null;
    previousLocation = null;
    api = {
      getLocation: function() {
        return angular.copy(location);
      },
      getPreviousLocation: function() {
        return angular.copy(previousLocation);
      },
      setLocation: function(x, y) {
        if (location) {
          previousLocation = location;
        }
        location = {
          x: x,
          y: y
        };
      }
    };
    return api;
  });

  angular.module("calendar.week").directive("bnDocumentMousemove", function($document, mouse) {
    return {
      link: function($scope, $element, $attributes) {
        var scopeExpression;
        scopeExpression = $attributes.bnDocumentMousemove;
        $document.on("mousemove", function(event) {
          mouse.setLocation(event.pageX, event.pageY);
          $scope.$apply(scopeExpression);
        });
      }
    };
  });

  angular.module("calendar.week").directive("bnDocumentMouseup", function($document) {
    return {
      link: function($scope, $element, $attributes) {
        var scopeExpression;
        scopeExpression = $attributes.bnDocumentMouseup;
        $document.on("mouseup", function(event) {
          $scope.$apply(scopeExpression);
        });
      }
    };
  });

  angular.module("calendar.week").directive("eventTooltip", function() {
    return {
      scope: {
        eventTooltip: "@"
      },
      template: "<div class=\"CalendarWeekRowCellTooltipAligner\"><div class=\"CalendarWeekTooltip\">{{ eventTooltip }}</div></div>",
      replace: false
    };
  });

}).call(this);

(function() {
  angular.module("directives.autocomplete", ["directives/autocomplete/autocomplete.tpl.html"]);

  angular.module("directives.autocomplete").directive("autocompleteEventInvite", function(Users, Events, $timeout, $http, $filter) {
    return {
      restrict: 'EA',
      replace: true,
      scope: {
        showAutocomplete: "=",
        startAt: "@",
        inputFocus: "=",
        resultLimit: "@",
        event: "=",
        newMembers: "="
      },
      templateUrl: "directives/autocomplete/autocomplete.tpl.html",
      link: function($scope, $element, $attrs) {
        var $input, filterAction, filterDelayed, filterThrottled;
        $input = $element.find("input");
        $input.focus(function() {
          $("html, body").animate({
            scrollTop: $input.offset().top
          }, 500);
        });
        $scope.startAt = parseInt($scope.startAt, 10) || 2;
        filterAction = function($scope) {
          var newVal;
          newVal = $scope.autocompleteQuery;
          if (_.isEmpty(newVal)) {
            $scope.result = [];
          } else {
            if (newVal.length >= $scope.startAt) {
              Users.inviteList(newVal).then(function(data) {
                $scope.result = data;
                return $timeout(function() {
                  return $(".autocomplete_item").css({
                    width: $input.width() + 14 + "px"
                  });
                });
              });
            } else {
              $scope.result = [];
            }
          }
        };
        filterDelayed = function($scope) {
          if (!$scope.$$phase) {
            $scope.$apply(function($scope) {
              filterAction($scope);
            });
          }
        };
        filterThrottled = _.debounce(filterDelayed, 500);
        $timeout(function() {
          $scope.result = [];
          return $scope.$watch("autocompleteQuery", function() {
            filterThrottled($scope);
          });
        });
        $scope.inviteMember = function(rec) {
          var department_id, group_id, sendInvitations;
          sendInvitations = function() {
            return Events.update($scope.event).then(function() {
              var alertMsg, sexPostfix;
              alertMsg = "";
              if (rec.type === "user") {
                sexPostfix = (rec.obj.sex === "F" ? "а" : "");
                alertMsg = rec.obj.full_name + " был" + sexPostfix + " приглашен" + sexPostfix + " на мероприятие.";
              }
              if (rec.type === "group") {
                alertMsg = "Участники «" + rec.obj.name + "» были приглашены на мероприятие.";
              }
              if (rec.type === "department") {
                return alertMsg = "Сотрудники отдела «" + rec.obj.name_ru + "» были приглашены на мероприятие.";
              }
            });
          };
          if (!angular.isArray($scope.event.members)) {
            $scope.event.members = [];
          }
          $scope.newMembers = [];
          if (!$scope.loading) {
            if (rec.type === "user") {
              if (!$filter('getById')($scope.event.members, rec.obj.id) && $scope.event.author.id !== rec.obj.id) {
                rec.obj.is_invitation_accepted = false;
                $scope.event.members = $scope.event.members.concat(rec.obj);
                $scope.newMembers.push(rec.obj);
              }
            }
            if (rec.type === "group") {
              group_id = rec.id;
              Users.getByGoup(group_id).then(function(members) {
                var newInvitations;
                newInvitations = 0;
                angular.forEach(members, function(user) {
                  if (!$filter('getById')($scope.event.members, user.id) && $scope.event.author.id !== user.id) {
                    user.is_invitation_accepted = false;
                    $scope.event.members = $scope.event.members.concat(user);
                    $scope.newMembers.push(user);
                    return newInvitations++;
                  }
                });
              });
            }
            if (rec.type === "department") {
              department_id = rec.id;
              Users.getByDepartment(department_id).then(function(members) {
                var newInvitations;
                newInvitations = 0;
                angular.forEach(members, function(user) {
                  if (!$filter('getById')($scope.event.members, user.id) && $scope.event.author.id !== user.id) {
                    user.is_invitation_accepted = false;
                    $scope.event.members = $scope.event.members.concat(user);
                    $scope.newMembers.push(user);
                    return newInvitations++;
                  }
                });
              });
            }
            $scope.result = [];
            return $scope.autocompleteQuery = "";
          }
        };
      }
    };
  });

  angular.module("directives.autocomplete").filter("getById", function() {
    return function(input, id) {
      var i, len;
      i = 0;
      len = input.length;
      while (i < len) {
        if (input[i].id === id) {
          return input[i];
        }
        i++;
      }
      return null;
    };
  });

}).call(this);

(function() {
  angular.module("directives.ellipsis", ["directives/ellipsis/ellipsis.tpl.html"]);

  angular.module("directives.ellipsis").directive("mlEllipsis", function() {
    return {
      restrict: "EA",
      transclude: true,
      scope: {
        ellipsis: "=",
        ellipsisUrl: "=",
        ellipsisStyle: "="
      },
      templateUrl: "directives/ellipsis/ellipsis.tpl.html"
    };
  });

  angular.module("directives.ellipsis").directive("mlEllipsisExcludeFromIsolated", function() {
    return {
      restrict: "ea",
      require: "^mlEllipsis",
      scope: false,
      link: [
        "$transclude", function($scope, $element, $attrs, $transclude) {
          return $transclude($scope.$parent, function(clone) {
            $element.empty();
            $element.append(clone);
          });
        }
      ]
    };
  });

}).call(this);

(function() {
  angular.module('common.directives', []);

}).call(this);


/*
Events MongoDB resource
 */

(function() {
  angular.module("common.api.events", ["restangular"]);

  angular.module("common.api.events").service("Events", function($http, $q, $user, apiEvents) {
    var that;
    that = this;
    this.events = [];
    this.currentUser = $user;
    this.updateLocalEvent = function(updatedEvent) {
      return angular.forEach(that.events, function(e, key) {
        if (updatedEvent.id === e.id) {
          that.events[key] = updatedEvent;
        }
      });
    };
    this.createEvent = function(event) {
      var deferred;
      deferred = $q.defer();
      apiEvents.create(event).then(function(createdEvent) {
        deferred.resolve(createdEvent);
        that.events.push(createdEvent);
      });
      return deferred.promise;
    };
    this.update = function(event) {
      var deferred;
      deferred = $q.defer();
      apiEvents.update(event).then(function(updatedEvent) {
        deferred.resolve(updatedEvent);
        return that.updateLocalEvent(updatedEvent);
      });
      return deferred.promise;
    };
    this.remove = function(id) {
      var deferred;
      deferred = $q.defer();
      apiEvents.remove(id).then(function(item) {
        deferred.resolve(item);
        return angular.forEach(that.events, function(e, key) {
          if (id === e.id) {
            that.events.splice(key, 1);
          }
        });
      });
      return deferred.promise;
    };
    this.getList = function() {
      var deferred, userId;
      deferred = $q.defer();
      userId = that.currentUser.id;
      apiEvents.read(userId).then(function(data) {
        that.events = data;
        deferred.resolve(data);
      });
      return deferred.promise;
    };
    this.getOne = function(event_id) {
      var deferred;
      deferred = $q.defer();
      apiEvents.one(event_id).then(function(data) {
        deferred.resolve(data);
      });
      return deferred.promise;
    };
    this.refuseMember = function(event_id, member_id) {
      return apiEvents.refuseMember(event_id, member_id).then(function() {
        return angular.forEach(that.events, function(e, index) {
          if (event_id === e.id) {
            that.events.splice(index, 1);
          }
        });
      });
    };
    this.acceptMember = function(event_id, member_id) {
      var deferred;
      deferred = $q.defer();
      apiEvents.acceptMember(event_id, member_id).then(function() {
        return that.getOne(event_id).then(function(event) {
          deferred.resolve(event);
          return that.updateLocalEvent(event);
        });
      });
      return deferred.promise;
    };
    this.inviteMembers = function(event_id, members) {
      return apiEvents.inviteMembers(event_id, members).then(function(event) {
        return that.updateLocalEvent(event);
      });
    };
  });

  angular.module("common.api.events").factory("apiEvents", function(Restangular) {
    var api, collection;
    api = {};
    collection = "events";
    api.read = function(authorId) {
      var params;
      params = {
        fields: {
          "name": 1,
          "start": 1,
          "end": 1,
          "author.id": 1,
          "author.full_name": 1,
          "members.id": 1,
          "members.is_invitation_accepted": 1
        },
        query: {
          $or: [
            {
              "author.id": authorId
            }, {
              "members.id": authorId
            }
          ]
        }
      };
      return Restangular.several(collection, "?f=" + JSON.stringify(params.fields) + "&q=" + JSON.stringify(params.query)).getList();
    };
    api.update = function(model) {
      return Restangular.one(collection, model.id).customPUT(model);
    };
    api.one = function(id) {
      return Restangular.one(collection, id).get();
    };
    api.remove = function(id) {
      return Restangular.one(collection, id).remove();
    };
    api.create = function(obj) {
      return Restangular.all(collection).post(obj);
    };
    api.inviteMembers = function(id, newMembers) {
      var body;
      body = {
        $push: {
          members: {
            $each: newMembers
          }
        }
      };
      return Restangular.one(collection, id).customPUT(JSON.stringify(body));
    };
    api.refuseMember = function(id, member_id) {
      var body;
      body = {
        $pull: {
          members: {
            id: member_id
          }
        }
      };
      return Restangular.one(collection, id).customPUT(JSON.stringify(body));
    };
    api.acceptMember = function(id, member_id) {
      var body, query;
      query = {
        "_id": {
          "$oid": id
        },
        "members.id": member_id
      };
      body = {
        $set: {
          "members.$.is_invitation_accepted": true
        }
      };
      return Restangular.all(collection).customPUT(JSON.stringify(body), "", {
        q: JSON.stringify(query)
      }, {});
    };
    return api;
  });

}).call(this);


/*
Users MongoDB resource
 */

(function() {
  angular.module("common.api.users", ["restangular"]);

  angular.module("common.api.users").service("Users", function($http, $q, Restangular) {
    var collection, that;
    that = this;
    collection = "users";
    this.getByGoup = function(group_id) {
      return [];
    };
    this.getByDepartment = function(department_id) {
      return [];
    };
    this.inviteList = function(query) {
      var deferred, params;
      deferred = $q.defer();
      params = {
        q: {
          "full_name": {
            $regex: query,
            $options: "i"
          }
        }
      };
      Restangular.all(collection).getList({
        q: JSON.stringify(params.q)
      }).then(function(rawData) {
        var data;
        data = [];
        rawData.forEach(function(row) {
          return data.push({
            type: "user",
            obj: row
          });
        });
        return deferred.resolve(data);
      });
      return deferred.promise;
    };
  });

}).call(this);

(function() {
  angular.module('common.api', ['common.api.events', 'common.api.users']);

}).call(this);

angular.module('templates.app', ['calendar/calendar.tpl.html', 'calendar/months/index.tpl.html', 'calendar/months/months.tpl.html', 'calendar/popup/event.edit.tpl.html', 'calendar/popup/event.view.tpl.html', 'calendar/week/event.tpl.html', 'calendar/week/index.tpl.html', 'calendar/week/timeline.tpl.html']);

angular.module("calendar/calendar.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("calendar/calendar.tpl.html",
    "<div ng-controller='CalendarCtrl'>\n" +
    "    <section class='CalendarWrapper' ng-style='{paddingTop: !showMonthCalendar ? 124 : 84}'>\n" +
    "        <div class='CalendarButtons'>\n" +
    "\n" +
    "            <div class='CalendarButtonsLeft' ng-click='showMonthCalendar=!showMonthCalendar'>\n" +
    "                <a class='ButtonCalendarExpand' ng-show='showMonthCalendar' title='Hide month calendar'></a>\n" +
    "                <a class='ButtonCalendarCollapse' ng-hide='showMonthCalendar' title='Show month calendar'></a>\n" +
    "            </div>\n" +
    "            <div class='CalendarButtonsRight'>\n" +
    "                <div class='ButtonGroup'>\n" +
    "                    <a class='ButtonCalendarWeek active' title='Week calendar'></a>\n" +
    "                    <a class='ButtonCalendarDaily' title='Day calendar'></a>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div ng-include='\"calendar/months/index.tpl.html\"'></div>\n" +
    "    </section>\n" +
    "\n" +
    "    <section class='CalendarWeekWrapper' bn-document-mouseup='mouseup()' bn-document-mousemove='mousemove()'\n" +
    "             ng-controller='CalendarWeekCtrl'>\n" +
    "        <div ng-view=''></div>\n" +
    "        <div ng-include='\"calendar/week/timeline.tpl.html\"'></div>\n" +
    "        <div ng-include='\"calendar/week/event.tpl.html\"'></div>\n" +
    "    </section>\n" +
    "</div>");
}]);

angular.module("calendar/months/index.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("calendar/months/index.tpl.html",
    "<div ng-if='showMonthCalendar' ng-controller='CalendarMonthCtrl'>\n" +
    "    <div class='CalendarLeft'>\n" +
    "        <div class='CalendarMonthHeader'>\n" +
    "            <a class='CalendarMonthHeaderSiblingMonth' ng-click='navigate.prevMonth()' href=''>\n" +
    "                {{ currentMonthFormatted(currentMonth-1)|capitalize }}\n" +
    "            </a>\n" +
    "\n" +
    "            <div class='CalendarMonthHeaderCurrentMonth'>\n" +
    "                <sup ng-show='currentYear !== nextYear'>{{ currentYear }}</sup>\n" +
    "                {{ currentMonthFormatted(currentMonth)|capitalize }}\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <calendar events='events' active-day='calendarData.activeDay' calendar-year='currentYear'\n" +
    "                  calendar-month='currentMonth'></calendar>\n" +
    "    </div>\n" +
    "    <div class='CalendarRight'>\n" +
    "        <div class='CalendarMonthHeaderRight'>\n" +
    "            <a class='CalendarMonthHeaderSiblingMonthRight' ng-click='navigate.nextMonth()' href=''>\n" +
    "                {{ nextMonthFormatted(nextMonth+1)|capitalize }}\n" +
    "            </a>\n" +
    "\n" +
    "            <div class='CalendarMonthHeaderCurrentMonthLeft'>\n" +
    "                {{ nextMonthFormatted(nextMonth)|capitalize }}\n" +
    "                <sup>{{ nextYear }}</sup>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <calendar events='events' active-day='calendarData.activeDay' calendar-year='nextYear'\n" +
    "                  calendar-month='nextMonth'></calendar>\n" +
    "    </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("calendar/months/months.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("calendar/months/months.tpl.html",
    "<div class='calendarMonth'>\n" +
    "    <div class='calendarMonthRow'>\n" +
    "        <div class='calendarMonthCellHeader' ng-repeat='weekday in weekdays'>\n" +
    "            {{ weekday|capitalize }}\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class='calendarMonthRow' ng-repeat='week in month'>\n" +
    "        <div class='calendarMonthCell' ng-repeat='day in week' ng-click='changeActiveDay()'\n" +
    "             ng-class='{calendarMonthCellActive: day.isToday, calendarMonthCellWeekend: day.dayIndex == 6 || day.dayIndex == 7}'>\n" +
    "            <div ng-show='!day.outmonth'>{{ day.day }}\n" +
    "                <div class='calendarMonthFill'\n" +
    "                     ng-style='{ height: day.eventsLoadHeight(), opacity: day.eventsLoadOpacity() }'\n" +
    "                     ng-show='day.events.length'></div>\n" +
    "                <div class='calendarMonthInviteBlock' ng-show='day.events.length'>\n" +
    "                    <div class='calendarMonthInvite' ng-show='day.getNotAccepted().length'>+</div>\n" +
    "                    <div class='calendarMonthInviteAccepted' ng-show='day.events.length - day.getNotAccepted().length'>\n" +
    "                        {{ day.events.length - day.getNotAccepted().length }}\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class='calendarMonthRow' ng-hide='month.length == 6'>\n" +
    "        <div class='calendarMonthCell' ng-repeat='day in [1,2,3,4,5,6,7]'></div>\n" +
    "    </div>\n" +
    "</div>");
}]);

angular.module("calendar/popup/event.edit.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("calendar/popup/event.edit.tpl.html",
    "\n" +
    "<div class='popup-bg'></div>\n" +
    "<form class='CalendarPopup' popup-position='' novalidate='' name='myForm' >\n" +
    "<div class='CalendarPopupClose' ng-click='cancel()'></div>\n" +
    "<div class='block post_header'>\n" +
    "    <h1 ng-hide='event.id'>New event</h1>\n" +
    "    <h1 ng-show='event.id'>Edit event</h1>\n" +
    "\n" +
    "</div>\n" +
    "<div class='block CalendarPopupGroupGreyBorder'>\n" +
    "    <div class='form_item'>\n" +
    "        <label class='label'>Name</label>\n" +
    "        <input class='textinput textinput__topborder' ng-focus='true'  ng-maxlength='140' ng-model='event.name' name='name' ng-required='true' />\n" +
    "        <div class='form_error' ng-show='myForm.name.$error.required'>Required field</div>\n" +
    "        <div class='form_error' ng-show='myForm.name.$error.maxlength'>The maximum name length - 140 characters</div>\n" +
    "\n" +
    "    </div>\n" +
    "    <div class='form_item CalendarPopupRelativeFormItem'>\n" +
    "        <div class='feedgroup_event_label'>\n" +
    "            <div class='feedgroup_event_label__left'>\n" +
    "                <label class='label'>Date</label>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div id='date_start' class='textinput_icon datepicker' pickadate-container='#date_start' pickadate='' ng-model='date_start'>\n" +
    "            <label></label>\n" +
    "            <input class='textinput textinput__topborder' ng-model='date_start' ng-required='true' name='date_start' ng-pattern='/^\\d{1,2}\\.\\d{1,2}\\.\\d{4}/' />\n" +
    "            <i class='textinput_icon__calendar textinput__topborder'></i>\n" +
    "            <div class='form_error' ng-show='myForm.date_start.$error.required'>Required field</div>\n" +
    "            <div class='form_error' ng-show='myForm.date_start.$error.pattern'>Enter the date in the format HH.MM.YYYY</div>\n" +
    "\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class='form_item'>\n" +
    "        <label class='label'>Time</label>\n" +
    "        <div class='feedgroup_event_time'>\n" +
    "            <div class='feedgroup_event_time_from'>\n" +
    "                from\n" +
    "                <input class='textinput textinput__topborder' ng-model='event.start' ng-required='true' date-to-time='' name='time_start' ng-pattern='/^([01]?[0-9]|2[0-3]):[0-5][0-9]/' />\n" +
    "                <div class='form_error' ng-show='myForm.time_start.$error.required'>Required field</div>\n" +
    "                <div class='form_error' ng-show='myForm.time_start.$error.pattern'>Enter the time in the format HH:MM</div>\n" +
    "            </div>\n" +
    "            <div class='feedgroup_event_time_to'>\n" +
    "                to\n" +
    "                <input class='textinput textinput__topborder' ng-model='event.end' ng-required='true' date-to-time='' name='time_end' ng-pattern='/^([01]?[0-9]|2[0-3]):[0-5][0-9]/' />\n" +
    "                <div class='form_error' ng-show='myForm.time_end.$error.required'>Required field</div>\n" +
    "                <div class='form_error' ng-show='myForm.time_end.$error.pattern'>Enter the time in the format HH:MM</div>\n" +
    "            </div>\n" +
    "            <div class='form_error' ng-show='myForm.$error.duplicate '>This time is already taken</div>\n" +
    "            <div class='form_error' ng-show='myForm.$error.wrong_interval'>Wrong time interval events. Minimum length - 30 minutes</div>\n" +
    "\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class='form_item' ng-show='!inputImportantFields()'>\n" +
    "        <div class='feedgroup_event_notice'>\n" +
    "            Specify the date and time to continue\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class='form_item' ng-show='inputImportantFields()'>\n" +
    "        <div class='feedgroup_event_label'>\n" +
    "            <div class='feedgroup_event_label__left'>\n" +
    "                <label class='label'>Place</label>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <input class='textinput textinput__topborder' ng-model='event.place' name='place' ng-required='true' />\n" +
    "        <div class='form_error' ng-show='myForm.place.$error.required'>Required field</div>\n" +
    "\n" +
    "    </div>\n" +
    "    <div class='form_item' ng-show='inputImportantFields()'>\n" +
    "        <label class='label'>Description</label>\n" +
    "        <textarea class='textinput textinput__topborder textareaPopupEvent' ng-model='event.description'></textarea>\n" +
    "    </div>\n" +
    "</div>\n" +
    "<div ng-show='inputImportantFields()'>\n" +
    "\n" +
    "    <div class='CalendarPopupGroup'>\n" +
    "        <div class='CalendarPopupMan' ng-show='event.author'>\n" +
    "            <div class='CalendarPopupManAvatar'>\n" +
    "                <div class='b-avatar b-avatar__medium'>\n" +
    "                    <img ng-src='{{ event.author.avatar_50_url }}' />\n" +
    "                </div>\n" +
    "            </div>\n" +
    "            <div class='CalendarPopupManName'>\n" +
    "                <a href='{{ event.author.profile_url }}' target='_blank'>{{ event.author.full_name }}</a>\n" +
    "                <p>{{ event.author.departament.name_ru }}</p>\n" +
    "                <strong>sponsor</strong>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class='CalendarPopupGroup' ng-repeat='member in acceptedMembers' ng-show='acceptedMembers.length <= 10 '>\n" +
    "        <div class='CalendarPopupMan CalendarPopupManRemovable'>\n" +
    "            <div class='CalendarPopupManRemoveButton' ng-click='removeMember($index)'></div>\n" +
    "            <div class='CalendarPopupManAvatar'>\n" +
    "                <div class='b-avatar b-avatar__medium' ng-colored-avatar='' status-source='member'>\n" +
    "                    <img ng-src='{{ member.avatar_50_url }}' />\n" +
    "                </div>\n" +
    "            </div>\n" +
    "            <div class='CalendarPopupManName'>\n" +
    "                <a href='{{ member.profile_url }}' target='_blank'>{{ member.full_name }}</a>\n" +
    "                <p>{{ member.departament.name_ru }}</p>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class='CalendarPopupGroup CalendarPopupMembers' ng-show='acceptedMembers.length > 10'>\n" +
    "        <div class='CalendarPopupMembersScroll'>\n" +
    "            <div class='CalendarPopupManAvatar' ng-repeat='member in acceptedMembers'>\n" +
    "                <div class='b-avatar b-avatar__medium'>\n" +
    "                    <img ng-src='{{ member.avatar_50_url }}' />\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div class='CalendarPopupMembersUnconfirmed' ng-show='notAcceptedMembers.length'>\n" +
    "            Not accepted members {{notAcceptedMembers.length}} people:\n" +
    "        </div>\n" +
    "        <div class='CalendarPopupMembersScroll' ng-show='notAcceptedMembers.length'>\n" +
    "            <div class='CalendarPopupManAvatar' ng-repeat='member in notAcceptedMembers'>\n" +
    "                <div class='b-avatar b-avatar__medium'>\n" +
    "                    <img ng-src='{{ member.avatar_50_url }}' />\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class='CalendarPopupGroup CalendarPopupMembers' ng-show='notAcceptedMembers.length'>\n" +
    "        <div class='CalendarPopupMembersUnconfirmed'>\n" +
    "            Not accepted members {{notAcceptedMembers.length}} people:\n" +
    "        </div>\n" +
    "        <div class='CalendarPopupMembersScroll'>\n" +
    "            <div class='CalendarPopupManAvatar' ng-repeat='member in notAcceptedMembers'>\n" +
    "                <div class='b-avatar b-avatar__medium'>\n" +
    "                    <img ng-src='{{ member.avatar_50_url }}' />\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class='block block_vpadding CalendarPopupGroupGreyBorder'>\n" +
    "        <div class='feedgroup_event_people_add CalendarPopupRelativeFormItem'>\n" +
    "            <label class='label'>Add members</label>\n" +
    "            <autocomplete-event-invite start-at=\"1\" result-limit=\"4\" show-autocomplete=\"showAutocomplete\" new-members=\"newMembers\" event=\"event\"></autocomplete-event-invite>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "<div class='block CalendarPopupGroupGreyBorder'>\n" +
    "    <input class='button button__grey' ng-disabled='loading || !inputImportantFields()' ng-click='submit()' type='submit' ng-hide='event.id' value='Create' />\n" +
    "    <input class='button button__grey' ng-disabled='loading || !inputImportantFields()' ng-click='submit()' type='submit' value='Save' ng-show='event.id' />\n" +
    "    <button class='button button__nobg button__blue' ng-click='cancel()'>Cancel</button>\n" +
    "</div>\n" +
    "<div class='CalendarPopupGroup' ng-show='event.id'>\n" +
    "    <button class='ButtonIconLeftCancel' ng-click='remove(event.id)'>Delete</button>\n" +
    "</div>\n" +
    "</form>\n" +
    "");
}]);

angular.module("calendar/popup/event.view.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("calendar/popup/event.view.tpl.html",
    "\n" +
    "<div class='popup-bg'></div>\n" +
    "<div class='CalendarPopup' scroll-to-popup='' popup-position=\"\">\n" +
    "    <div class='CalendarPopupClose' ng-click='cancel()'></div>\n" +
    "    <div class='CalendarPopupGroup'>\n" +
    "        <div class='CalendarPopupHeader'>{{ event.name }}\n" +
    "            <div class='CalendarPopupHeaderDescr'>\n" +
    "            from {{ event.start | dateFilter:\"H:mm\" }} to {{ event.end | dateFilter:\"H:mm\" }}\n" +
    "        </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class='CalendarPopupGroup' ng-if='event.place'>\n" +
    "        <div class='CalendarPopupAdress'>\n" +
    "            {{ event.place }}\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class='CalendarPopupGroup' ng-if='event.description'>\n" +
    "        <button class='ButtonIconLeftInfo' ng-click='showDescription=!showDescription' ng-show='!showDescription'>\n" +
    "            Description\n" +
    "        </button>\n" +
    "        <button class='ButtonIconLeftInfo' ng-click='showDescription=!showDescription' ng-show='showDescription'>\n" +
    "            Hide description\n" +
    "        </button>\n" +
    "        <div class='CalendarPopupInfoText' ng-show='showDescription'>\n" +
    "            <p>{{ event.description }}</p>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class='CalendarPopupGroup'>\n" +
    "        <div class='CalendarPopupMan' ng-show='event.author'>\n" +
    "            <div class='CalendarPopupManAvatar'>\n" +
    "                <div class='b-avatar b-avatar__medium'>\n" +
    "                    <img ng-src='{{ event.author.avatar_50_url }}' />\n" +
    "\n" +
    "                </div>\n" +
    "            </div>\n" +
    "            <div class='CalendarPopupManName'>\n" +
    "                <a href='{{ event.author.profile_url }}' target='_blank'>{{ event.author.full_name }}</a>\n" +
    "                <p>{{ event.author.departament.name_ru }}</p>\n" +
    "                <strong>sponsor</strong>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class='CalendarPopupGroup' ng-repeat='member in acceptedMembers' ng-show='acceptedMembers.length <= 10 '>\n" +
    "        <div class='CalendarPopupMan'>\n" +
    "            <div class='CalendarPopupManAvatar'>\n" +
    "                <div class='b-avatar b-avatar__medium' ng-colored-avatar='' status-source='member'>\n" +
    "                    <img ng-src='{{ member.avatar_50_url }}' />\n" +
    "                </div>\n" +
    "            </div>\n" +
    "            <div class='CalendarPopupManName'>\n" +
    "                <a href='{{ member.profile_url }}' target='_blank'>{{ member.full_name }}</a>\n" +
    "                <p>{{ member.departament.name_ru }}</p>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class='CalendarPopupGroup CalendarPopupMembers' ng-show='acceptedMembers.length > 10'>\n" +
    "        <div class='CalendarPopupMembersScroll'>\n" +
    "            <div class='CalendarPopupManAvatar' ng-repeat='member in acceptedMembers'>\n" +
    "                <div class='b-avatar b-avatar__medium'>\n" +
    "                    <img ng-src='{{ member.avatar_50_url }}' />\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div class='CalendarPopupMembersUnconfirmed' ng-show='notAcceptedMembers.length'>\n" +
    "            Not accepted members {{notAcceptedMembers.length}} people:\n" +
    "        </div>\n" +
    "        <div class='CalendarPopupMembersScroll' ng-show='notAcceptedMembers.length'>\n" +
    "            <div class='CalendarPopupManAvatar' ng-repeat='member in notAcceptedMembers'>\n" +
    "                <div class='b-avatar b-avatar__medium'>\n" +
    "                    <img ng-src='{{ member.avatar_50_url }}' />\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class='CalendarPopupGroup CalendarPopupMembers' ng-show='notAcceptedMembers.length'>\n" +
    "        <div class='CalendarPopupMembersUnconfirmed'>\n" +
    "            Not accepted members {{notAcceptedMembers.length}} people:\n" +
    "        </div>\n" +
    "        <div class='CalendarPopupMembersScroll'>\n" +
    "            <div class='CalendarPopupManAvatar' ng-repeat='member in notAcceptedMembers'>\n" +
    "                <div class='b-avatar b-avatar__medium'>\n" +
    "                    <img ng-src='{{ member.avatar_50_url }}' />\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class='CalendarPopupGroup' ng-show='$eventPopup.isAcceptedEvent()'>\n" +
    "        <button class='ButtonIconLeftAddMembers' ng-click='showAutocomplete=!showAutocomplete'>\n" +
    "            Add members\n" +
    "        </button>\n" +
    "        <autocomplete-event-invite start-at=\"1\" result-limit=\"4\" input-focus=\"showAutocomplete\" show-autocomplete=\"showAutocomplete\" new-members=\"newMembers\" event=\"event\"></autocomplete-event-invite>\n" +
    "    </div>\n" +
    "    <div class='CalendarPopupGroup' ng-show='$eventPopup.isEditable()'>\n" +
    "        <button class='ButtonIconLeftEdit' ng-click='edit()'>\n" +
    "            Edit\n" +
    "        </button>\n" +
    "    </div>\n" +
    "    <div class='CalendarPopupGroup' ng-hide='$eventPopup.isAcceptedEvent()'>\n" +
    "        <button class='button button__bgblue ButtonSmall' ng-click='acceptEvent()'>Accept event</button>\n" +
    "        <button class='button button__bgrose ButtonSmall' ng-click='refuseEvent()'>Refuse event</button>\n" +
    "    </div>\n" +
    "    <div class='CalendarPopupGroup' ng-show='$eventPopup.isAcceptedEvent() && !$eventPopup.isEditable()'>\n" +
    "        <button class='ButtonIconLeftCancel' ng-click='refuseEvent()'>Refuse event</button>\n" +
    "    </div>\n" +
    "</div>");
}]);

angular.module("calendar/week/event.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("calendar/week/event.tpl.html",
    "<div class='CalendarWeekOverlayItem CalendarWeekOverlayItemActive'\n" +
    "     ng-style='{left:getEventLeft($eventPopup.event), top:getEventTop($eventPopup.event), height:getEventHeight($eventPopup.event), width:getEventWidth($eventPopup.event) }'\n" +
    "     ml-ellipsis='' ng-show='$eventPopup.isNewEvent()'>\n" +
    "    <div class='CalendarWeekOverlayItemNewEventCutted' ng-show='$eventPopup.event.newEvent'>New event</div>\n" +
    "    {{$eventPopup.event.name}}\n" +
    "    <div class='CalendarWeekOverlayItemInviteAccepted' ng-show='$eventPopup.event.inviteAccepted'></div>\n" +
    "</div>\n" +
    "<ul class='CalendarWeekOverlay'>\n" +
    "    <li class='CalendarWeekOverlayItem' ng-click='eventView(event)'\n" +
    "        ng-style='{left:getEventLeft(event), top:getEventTop(event), height:getEventHeight(event), width:getEventWidth(event), zIndex: getEventZindex1(event) }'\n" +
    "        ng-mousedown='moveEvent(event)' ng-repeat='event in events | filter:isInWeek | filter:isVisibleTime'\n" +
    "        ng-class='{CalendarWeekOverlayItemActive : $eventPopup.isActive(event)}' ml-ellipsis=''>\n" +
    "        <div class='CalendarWeekOverlayItemNewEventCutted' ng-show='!$eventPopup.isAcceptedEvent(event)'>\n" +
    "            New event\n" +
    "        </div>\n" +
    "        {{event.name}}\n" +
    "        <div ng-switch='isEventAcceptedAll(event)' ng-if='$user.id == event.author.id'>\n" +
    "            <div class='CalendarWeekOverlayItemInviteAccepted' ng-switch-when='true'></div>\n" +
    "            <div class='CalendarWeekOverlayItemInvite' ng-switch-when='false'></div>\n" +
    "        </div>\n" +
    "        <div class='CalendarWeekOverlayItemDrag' ng-mousedown='resizeEvent()' ng-if='calendarConfig.moveEvents'>=</div>\n" +
    "    </li>\n" +
    "</ul>");
}]);

angular.module("calendar/week/index.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("calendar/week/index.tpl.html",
    "<section class='CalendarWeekWrapper' bn-document-mouseup='mouseup()' bn-document-mousemove='mousemove()'\n" +
    "         ng-controller='CalendarWeekCtrl'>\n" +
    "    <div ng-view=''></div>\n" +
    "    <div ng-include='\"calendar/week/timeline.tpl.html\"'></div>\n" +
    "    <div ng-include='\"calendar/week/event.tpl.html\"'></div>\n" +
    "</section>");
}]);

angular.module("calendar/week/timeline.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("calendar/week/timeline.tpl.html",
    "<table class='CalendarWeek'>\n" +
    "    <tr>\n" +
    "        <th class='CalendarWeekHead'></th>\n" +
    "        <th class='CalendarWeekHead CalendarWeekHeadWeekday' data-weekday='1'>{{view.start | timelineWeek:0 }},\n" +
    "            <nobr>{{view.start | timelineDay:0 }}</nobr>\n" +
    "        </th>\n" +
    "        <th class='CalendarWeekHead CalendarWeekHeadWeekday' data-weekday='2'>{{view.start | timelineWeek:1 }},\n" +
    "            <nobr>{{view.start | timelineDay:1 }}</nobr>\n" +
    "        </th>\n" +
    "        <th class='CalendarWeekHead CalendarWeekHeadWeekday' data-weekday='3'>{{view.start | timelineWeek:2 }},\n" +
    "            <nobr>{{view.start | timelineDay:2 }}</nobr>\n" +
    "        </th>\n" +
    "        <th class='CalendarWeekHead CalendarWeekHeadWeekday' data-weekday='4'>{{view.start | timelineWeek:3 }},\n" +
    "            <nobr>{{view.start | timelineDay:3 }}</nobr>\n" +
    "        </th>\n" +
    "        <th class='CalendarWeekHead CalendarWeekHeadWeekday' data-weekday='5'>{{view.start | timelineWeek:4 }},\n" +
    "            <nobr>{{view.start | timelineDay:4 }}</nobr>\n" +
    "        </th>\n" +
    "        <th class='CalendarWeekHead CalendarWeekHeadWeekend' data-weekday='6'>{{view.start | timelineWeek:5 }},\n" +
    "            <nobr>{{view.start | timelineDay:5 }}</nobr>\n" +
    "        </th>\n" +
    "        <th class='CalendarWeekHead CalendarWeekHeadWeekend' data-weekday='0'>{{view.start | timelineWeek:6 }},\n" +
    "            <nobr>{{view.start | timelineDay:6 }}</nobr>\n" +
    "        </th>\n" +
    "        <th class='CalendarWeekHead'></th>\n" +
    "    </tr>\n" +
    "    <tbody>\n" +
    "    <tr ng-repeat='row in timeline.notWorkingTime1()' ng-if='showNotWorkingTime1'>\n" +
    "        <td class='CalendarWeekRowCellTime' data-hour='{{ row }}' ng-class='{active : isActualHour(row)}'>{{ row }}:00\n" +
    "        </td>\n" +
    "        <td class='CalendarWeekRowCell' ng-repeat='i in [0,1,2,3,4,5,6]' ng-click='createEmptyEventOnCell(row, i)'\n" +
    "            event-tooltip='Create new event'></td>\n" +
    "        <td class='CalendarWeekRowCellTime'>{{ row }}:00</td>\n" +
    "    </tr>\n" +
    "    <tr ng-if='!showNotWorkingTime1'>\n" +
    "        <td class='CalendarWeekRowShowTime' colspan='9'>\n" +
    "            <button class='CalendarWeekShowTime' ng-click='showNotWorkingTime(1)'>Early time</button>\n" +
    "        </td>\n" +
    "    </tr>\n" +
    "    </tbody>\n" +
    "    <tbody>\n" +
    "    <tr class='CalendarWeekRow' ng-repeat='row in timeline.workingTime()' ng-class='{active : isActualHour(row)}'>\n" +
    "        <td class='CalendarWeekRowCellTime' data-hour='{{ row }}' ng-class='{active : isActualHour(row)}'>{{ row }}:00\n" +
    "        </td>\n" +
    "        <td class='CalendarWeekRowCell' ng-repeat='i in [0,1,2,3,4,5,6]' ng-click='createEmptyEventOnCell(row, i)'\n" +
    "            event-tooltip='Create new event'></td>\n" +
    "        <td class='CalendarWeekRowCellTime'>{{ row }}:00</td>\n" +
    "\n" +
    "    </tr>\n" +
    "    </tbody>\n" +
    "    <tbody>\n" +
    "    <tr ng-repeat='row in timeline.notWorkingTime2()' ng-if='showNotWorkingTime2'>\n" +
    "        <td class='CalendarWeekRowCellTime' data-hour='{{ row }}' ng-class='{active : isActualHour(row)}'>{{ row }}:00\n" +
    "        </td>\n" +
    "        <td class='CalendarWeekRowCell' ng-repeat='i in [0,1,2,3,4,5,6]' ng-click='createEmptyEventOnCell(row, i)'\n" +
    "            event-tooltip='Create new event'></td>\n" +
    "        <td class='CalendarWeekRowCellTime'>{{ row }}:00</td>\n" +
    "    </tr>\n" +
    "    <tr ng-if='!showNotWorkingTime2'>\n" +
    "        <td class='CalendarWeekRowShowTime' colspan='9'>\n" +
    "            <button class='CalendarWeekShowTime' ng-click='showNotWorkingTime(2)'>Late time</button>\n" +
    "        </td>\n" +
    "    </tr>\n" +
    "    </tbody>\n" +
    "</table>");
}]);

angular.module('templates.common', ['directives/autocomplete/autocomplete.tpl.html', 'directives/ellipsis/ellipsis.tpl.html']);

angular.module("directives/autocomplete/autocomplete.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("directives/autocomplete/autocomplete.tpl.html",
    "<div class='autocompleteWrapper autocompleteTop' ng-show='showAutocomplete'>\n" +
    "    <input class='textinput textinput__topborder textinput__bluefocus' ng-model='autocompleteQuery' ng-focus='showAutocomplete' />                <div class='autocomplete' ng-show='result.length'>\n" +
    "    <div class='autocomplete_item' ng-repeat='rec in result | limitTo:resultLimit' ng-click='inviteMember(rec)'>\n" +
    "        <div ng-if='rec.type == \"user\"'>\n" +
    "            <div class='autocomplete_item_avatar_wrap'>\n" +
    "                <div class='person_avatar' ng-colored-avatar='' status-source='rec.obj'>\n" +
    "                    <a href='{{ rec.obj.profile_url }}'>\n" +
    "                        <img ng-src='{{ rec.obj.avatar_50_url }}' />\n" +
    "                    </a>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "            <div class='autocomplete_item_text'>\n" +
    "                <div class='autocomplete_item_name'>\n" +
    "                    {{ rec.obj.full_name }}\n" +
    "                </div>\n" +
    "                <div class='autocomplete_item_depart'>\n" +
    "                    {{ rec.obj.position.name_ru }}, {{ rec.obj.departament.name_ru }}\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div ng-if='rec.type == \"group\"'>\n" +
    "            <div class='autocomplete_item_text'>\n" +
    "                <div class='autocomplete_item_name'>\n" +
    "                    {{ rec.obj.name }}\n" +
    "                </div>\n" +
    "                <div class='autocomplete_item_depart'>\n" +
    "                    {{ rec.obj.description }}\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div ng-if='rec.type == \"department\"'>\n" +
    "            <div class='autocomplete_item_text'>\n" +
    "                <div class='autocomplete_item_name'>\n" +
    "                    {{ rec.obj.name_ru }}\n" +
    "                </div>\n" +
    "                <div class='autocomplete_item_depart'>\n" +
    "                    {{ rec.obj.description }}\n" +
    "\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class='autocomplete_item' ng-hide='result.length <= resultLimit'>\n" +
    "        <div class='autocomplete_item_text'>\n" +
    "            <div class='autocomplete_item_name'>\n" +
    "                Найдено ещё {{result.length-resultLimit}} {{result.length-resultLimit|plural:\"совпадение,совпадения,совпадений\"}}\n" +
    "            </div>\n" +
    "            <div class='autocomplete_item_depart'>\n" +
    "                Уточните поиск чтоб увидеть результаты\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "</div>");
}]);

angular.module("directives/ellipsis/ellipsis.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("directives/ellipsis/ellipsis.tpl.html",
    "<div class=\"ml-ellipsis\">\n" +
    "    <div class=\"ml-ellipsis-before\"></div>\n" +
    "    <div class=\"ml-ellipsis-content\" ng-transclude></div>\n" +
    "    <div class=\"ml-ellipsis-after\">\n" +
    "        <span ng-if=\"ellipsis\" ng-bind=\"ellipsis\" ng-style=\"ellipsisStyle\"></span>\n" +
    "\n" +
    "        <span ng-if=\"!ellipsis && ellipsisUrl\" ml-ellipsis-exclude-from-isolated>\n" +
    "            <span ng-include=\"ellipsisUrl\" ng-style=\"ellipsisStyle\"></span>\n" +
    "        </span>\n" +
    "\n" +
    "        <span ng-if=\"!ellipsis && !ellipsisUrl\" ng-style=\"ellipsisStyle\">&hellip;</span>\n" +
    "    </div>\n" +
    "</div>");
}]);
