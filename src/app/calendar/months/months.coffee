angular.module("calendar.months", [
    "calendar/months/index.tpl.html"
    "calendar/months/months.tpl.html"
])

angular.module("calendar.months").directive "ngHtml", ->
    (scope, element, attrs) ->
        scope.$watch attrs.ngHtml, (value) ->
            element[0].innerHTML = value
            return

angular.module("calendar.months").directive "calendar", (calendarConfig, $user, $filter) ->
    restrict: "E"
    scope:
        assignedMonth: "=calendarMonth"
        assignedyear: "=calendarYear"
        activeDay: "="
        events: "="
    templateUrl: "calendar/months/months.tpl.html"
    link: (scope, element) ->
        #init calendar
        init = ->
            weekdays = ->
                weekdays = moment.weekdays() #weekdays: ["sunday".."saturday"]
                sunday = weekdays[0]
                weekdays.splice(0,1)
                weekdays.push(sunday)
                weekdays

            scope.weekdays = weekdays()

            scope.month = monthInit(scope.currentDate.getMonth() + 1, scope.currentDate.getFullYear())
            renderEvents scope.events  if scope.events
            return

        daysInMonth = (month, year) ->
            new Date(year, month, 0).getDate()

        monthInit = (month, year) ->
            monthArray = []
            firstDay = new Date(year, month - 1, 1, 0, 0, 0, 0)
            firstDayInFirstweek = (if (firstDay.getDay() > 0) then firstDay.getDay() else 7)
            daysOfMonth = daysInMonth(month, year)
            prevDaysOfMonth = daysInMonth(month - 1, year)
            recordDate = 0
            monthArray.push weekInit(year, month, recordDate - firstDayInFirstweek, daysOfMonth, prevDaysOfMonth)
            recordDate = 7 - firstDayInFirstweek
            while recordDate < daysOfMonth - 1
                monthArray.push weekInit(year, month, recordDate, daysOfMonth)
                recordDate += 7
            if scope.currentDate.getMonth() is scope.today.getMonth() and scope.currentDate.getFullYear() is scope.today.getFullYear()
                atWeek = Math.ceil((scope.today.getDate() + firstDayInFirstweek - 1) / 7) - 1
                atDay = (scope.today.getDate() + firstDayInFirstweek - 2) % 7
                monthArray[atWeek][atDay].isToday = true
            monthArray

        weekInit = (year, month, startDate, daysOfMonth, prevDaysOfMonth) ->
            week = []
            i = 1

            while i <= 7
                day = undefined
                outmonth = false
                if startDate + i < 0
                    day = prevDaysOfMonth + startDate + i + 1
                    outmonth = true
                else if startDate + i + 1 > daysOfMonth
                    day = startDate + i - daysOfMonth + 1
                    outmonth = true
                else
                    day = startDate + i + 1

                obj =
                    outmonth: outmonth
                    dayIndex: i
                    day: day
                    date: new Date(year, month - 1, day)
                    events: []

                week.push obj

                i++
            week

        renderEvents = (events) ->
            return  unless angular.isArray(scope.month)

            scope.month.forEach (week, i) ->
                week.forEach (day, j) ->
                    scope.month[i][j].events = []
                    scope.month[i][j].eventsLoad = ->
                        p = 0
                        loadsMs = 0
                        angular.forEach @events, (e, key) ->
                            eventHour = moment(e.start).hours()
                            loadsMs += moment(e.end).diff(moment(e.start))  if eventHour >= calendarConfig.workTime[0] and eventHour < calendarConfig.workTime[1]
                            return

                        p = (100 * loadsMs) / ((calendarConfig.workTime[1] - calendarConfig.workTime[0] + 1) * 3600000)  if loadsMs
                        p

                    scope.month[i][j].getNotAccepted = ->
                        notAcceptedEvents = []
                        if angular.isArray(@events)
                            angular.forEach @events, (event) ->
                                notAcceptedEvents.push event if not $filter('isAcceptedEvent')(event)
                                return

                        notAcceptedEvents

                    scope.month[i][j].eventsLoadHeight = ->
                        @eventsLoad() + "%"

                    scope.month[i][j].eventsLoadOpacity = ->
                        @eventsLoad() / 100 + 0.3

                    events.forEach (e) ->
                        eventDate = moment(e.start, "YYYY-MM-DD")
                        calendarDate = moment(day.date)
                        diff = calendarDate.diff(eventDate, "days")
                        scope.month[i][j].events.push e  unless diff
                        return

                    return

                return

            return

        scope.$watch "events", ((newVal) ->
            renderEvents newVal  if newVal
            return
        ), true #todo refactor watch events

        scope.$watch "assignedMonth", (newVal, oldVal) ->
            targetMonth = parseInt(scope.assignedMonth, 10)
            targetYear = parseInt(scope.assignedyear, 10)
            if not isNaN(targetMonth) and not isNaN(targetYear) and targetMonth >= 0 and targetMonth <= 12
                scope.currentDate = new Date(targetYear, targetMonth, 0)
            else
                scope.currentDate = new Date()
            scope.today = new Date()
            scope.navigate = {}
            scope.changeActiveDay = ->
                return false  if @day.outmonth
                scope.month.forEach (week, i) ->
                    week.forEach (day, j) ->
                        scope.month[i][j].active = false
                        return

                    return

                scope.activeDay.active = false  if scope.activeDay
                scope.activeDay = @day
                @day.active = true
                return


            scope.navigate.prevMonth = ->
                scope.currentDate.setMonth scope.currentDate.getMonth() - 1
                refreshCalendar()
                return

            scope.navigate.nextMonth = ->
                scope.currentDate.setMonth scope.currentDate.getMonth() + 1
                refreshCalendar()
                return

            scope.navigate.thisMonth = ->
                scope.currentDate = new Date()
                refreshCalendar()
                return

            refreshCalendar = ->
                init()

            refreshCalendar()
            return

        return

angular.module("calendar.months").controller "CalendarMonthCtrl", ($scope, CalendarData) ->
    $scope.currentDate = new Date()
    $scope.calendarData = CalendarData
    refreshCalendar = ->
        currentDate = moment($scope.currentDate)
        nextDate = moment($scope.currentDate).add("M", 1)
        $scope.currentYear = parseInt(currentDate.format("YYYY"), 10)
        $scope.currentMonth = parseInt(currentDate.format("M"), 10)
        $scope.nextMonth = parseInt(nextDate.format("M"), 10)
        $scope.nextYear = parseInt(nextDate.format("YYYY"), 10)
        return

    refreshCalendar()
    $scope.navigate =
        prevMonth: ->
            $scope.currentDate.setMonth $scope.currentDate.getMonth() - 1
            refreshCalendar()
            return

        nextMonth: ->
            $scope.currentDate.setMonth $scope.currentDate.getMonth() + 1
            refreshCalendar()
            return

    $scope.currentMonthFormatted = (currentMonth) ->
        moment().month(currentMonth - 1).format "MMMM"

    $scope.nextMonthFormatted = (nextMonth) ->
        moment().month(nextMonth - 1).format "MMMM"
    return