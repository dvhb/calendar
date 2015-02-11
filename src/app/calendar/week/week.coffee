angular.module("calendar.week", [
    "calendar/week/index.tpl.html"
    "calendar/week/timeline.tpl.html"
    "calendar/week/event.tpl.html"
    "directives.ellipsis"
])

angular.module("calendar.week").factory "$timeline", (calendarConfig) ->
    workTimeInterval: calendarConfig.workTime
    notWorkingTime1: ->
        time = []
        i = 0

        while i < @workTimeInterval[0]
            time.push i
            i++
        time

    workingTime: ->
        time = []
        i = @workTimeInterval[0]

        while i <= @workTimeInterval[1]
            time.push i
            i++
        time

    notWorkingTime2: ->
        time = []
        i = @workTimeInterval[1] + 1

        while i <= 23
            time.push i
            i++
        time

angular.module("calendar.week").controller "CalendarWeekCtrl", ($rootScope, $scope, $http, mouse, calendarConfig, $filter, CalendarData, $timeline, $eventPopup, $location, $user) ->
    $scope.$eventPopup = $eventPopup
    $scope.$user = $user
    $scope.calendarData = CalendarData
    $scope.view =
        start: moment().startOf('week')
        end: moment().endOf('week')

    $scope.timeline = $timeline
    $scope.calendarConfig = calendarConfig
    $scope.$watch "calendarData.activeDay.date", (newVal) ->
        if newVal
            date = moment(newVal)
            weekStart = undefined
            weekEnd = undefined
            weekStart = (if (date.format("d") isnt "0") then date.startOf("week").day(+1) else date.day(-1).startOf("week").day(+1))
            weekEnd = moment(weekStart).day(+7)
            $scope.view.start = weekStart
            $scope.view.end = weekEnd
            $scope.openNotWorkingTimeWithEvents()
        return

    window.onresize = ->
        $scope.$apply()
        return

    $scope.switchDate = (val) ->
        $scope.view.start = moment($scope.view.start).add("d", val)
        $scope.view.end = moment($scope.view.end).add("d", val)
        return

    $scope.weekDayFormatted = (weekday) ->
        moment($scope.view.start).add("d", weekday).format "D MMMM"

    $scope.getEventRow = (event) ->
        hour = moment(event.start).format("H")
        $ "[data-hour='#{hour}']"  if event

    $scope.getEventColumn = (event) ->
        weekday = moment(event.start).format("d")
        $ "[data-weekday='#{weekday}']" if event

    $scope.getEventHeight = (event) ->
        if event
            refRow = $scope.getEventRow(event)
            rowHeight = refRow.outerHeight()
            minutes = moment(event.end).diff(moment(event.start), "minutes")
            dx = Math.ceil(minutes / 60) - 1
            ((rowHeight / 60) * minutes) + dx

    $scope.getEventWidth = (currentEvent) ->
        if currentEvent
            refColumn = $scope.getEventColumn(currentEvent)
            eventWidth = refColumn.width() + 1
            events = $scope.events
            zIndex = $scope.getEventZindex(currentEvent, events)
            eventWidth -= 20  if zIndex
            eventWidth

    $scope.getEventTop = (event) ->
        refRow = $scope.getEventRow(event)

        if event and refRow.length
            (refRow.position().top) + Math.round((refRow.outerHeight() / 60) * moment(event.start).format("mm"))

    $scope.getEventZindex1 = (event) ->
        if $eventPopup.isActive(event)
            1001 + event.zIndex
        else
            event.zIndex

    $scope.getEventZindex = (currentEvent) ->
        events = $scope.events
        zIndex = 0
        eventsInThisDay = $filter("getEventByDay")(events, currentEvent.start)
        angular.forEach eventsInThisDay, (e) ->
            if e.id isnt currentEvent.id
                zIndex = 1  if (new Date(currentEvent.start) < new Date(e.end)) and (new Date(currentEvent.start) > new Date(e.start))
                zIndex = 2  if (new Date(currentEvent.start) > new Date(e.start)) and (new Date(currentEvent.end) < new Date(e.end))
                if (new Date(currentEvent.start).valueOf() is new Date(e.start).valueOf()) and (new Date(currentEvent.end).valueOf() is new Date(e.end).valueOf()) and not e.alreadyMoved
                    currentEvent.alreadyMoved = true
                    zIndex = 3
            return

        zIndex

    $scope.getEventLeft = (currentEvent) ->
        refColumn = $scope.getEventColumn(currentEvent)
        positionLeft = 0
        events = $scope.events
        if currentEvent and refColumn.length
            positionLeft = refColumn.position().left
            zIndex = $scope.getEventZindex(currentEvent, events)
            positionLeft += 20  if zIndex
            currentEvent.zIndex = zIndex
            positionLeft

    $scope.resizeEventObj = null
    $scope.resizeDelta = 0
    $scope.resizeEvent = ->
        $rootScope.$broadcast "events.onClick", this
        return  unless calendarConfig.moveEvents
        $scope.resizeEventObj = @event
        $scope.resizeDelta = 0
        return

    $scope.getTimelineTop = ->
        refRow = $("[data-hour=\"" + moment().format("H") + "\"]")
        top = 0
        if refRow.length
            if moment().format("H") is 0 and moment().format("mm") is 0
                top = refRow.position().top + 2
            else
                top = (refRow.position().top) + Math.round((refRow.outerHeight() / 60) * moment().format("mm"))
            top - 1

    $scope.isActualWeek = (date) ->
        diff = -1
        if date
            diff = moment(date).diff(moment($scope.view.start), "days")
        else
            diff = moment().diff(moment($scope.view.start), "days")
        diff >= 0 and diff <= 7

    $scope.isActualHour = (hour) ->
        $scope.isActualWeek() is true and moment().format("H") is hour

    $scope.openNotWorkingTimeWithEvents = ->
        $scope.showNotWorkingTime1 = false
        $scope.showNotWorkingTime2 = false
        $scope.events.forEach (event) ->
            isInWeek = $scope.isInWeek(event)
            if isInWeek
                h = parseInt(moment(event.start).format("H"), 10)
                $scope.showNotWorkingTime1 = true  if $timeline.notWorkingTime1().indexOf(h) isnt -1
                $scope.showNotWorkingTime2 = true  if $timeline.notWorkingTime2().indexOf(h) isnt -1
            return

        return

    $scope.isInWeek = (event) ->
        diff = moment(event.start).startOf("day").diff(moment($scope.view.start).startOf("day"), "days")
        diff >= 0 and diff < 7

    $scope.isVisibleTime = (event) ->
        refRow = $scope.getEventRow(event)
        refRow.length

    $scope.isToday = (day) ->
        $scope.isActualWeek() is true and moment().format("d") - 1 is day

    $scope.moveEventObj = null
    $scope.moveDelta = 0
    $scope.moveEvent = (event) ->
        $rootScope.$broadcast "events.onClick", event
        return  unless calendarConfig.moveEvents
        $scope.moveEventObj = event
        $scope.moveDelta = 0
        return

    $scope.mousemove = ->
        return  unless calendarConfig.moveEvents
        refRow = $scope.getEventRow($scope.moveEventObj)
        rowHeight = refRow.outerHeight() / 2
        newStart = undefined
        newStartRow = undefined
        newEnd = undefined
        newEndRow = undefined
        if $scope.resizeEventObj?
            $scope.resizeDelta += mouse.getLocation().y - mouse.getPreviousLocation().y
            if $scope.resizeDelta > rowHeight or $scope.resizeDelta < -rowHeight
                newStart = moment($scope.moveEventObj.start)

                newEndDelta = Math.round($scope.resizeDelta / rowHeight) * calendarConfig.step
                newEnd = moment($scope.resizeEventObj.end).add("m", newEndDelta)

                newEndRow = $scope.getEventRow(start: moment(newEnd).subtract("minute", 30))
                $scope.resizeEventObj.end = newEnd  if newEndRow.length and newEnd.diff(newStart, "minutes")
                $scope.resizeDelta = 0
        else if $scope.moveEventObj?
            $scope.moveDelta += mouse.getLocation().y - mouse.getPreviousLocation().y
            if $scope.moveDelta > rowHeight or $scope.moveDelta < -rowHeight
                newStartDelta = Math.round($scope.moveDelta / rowHeight) * calendarConfig.step
                newStart = moment($scope.moveEventObj.start).add("m", newStartDelta)

                newEndDelta = Math.round($scope.moveDelta / rowHeight) * calendarConfig.step
                newEnd = moment($scope.moveEventObj.end).add("m", newEndDelta)

                newStartRow = $scope.getEventRow(start: newStart)
                newEndRow = $scope.getEventRow(start: moment(newEnd).subtract("minute", 30))
                if newStartRow.length and newEndRow.length
                    $scope.moveEventObj.start = newStart
                    $scope.moveEventObj.end = newEnd
                $scope.moveDelta = 0

            refColumn = $scope.getEventColumn($scope.moveEventObj)
            colWidth = refColumn.outerWidth()

            if refColumn.length
                if mouse.getLocation().x < refColumn.offset().left and refColumn.index() > 1
                    $scope.moveEventObj.start = moment($scope.moveEventObj.start).subtract("d", 1)
                    $scope.moveEventObj.end = moment($scope.moveEventObj.end).subtract("d", 1)

                if mouse.getLocation().x > (refColumn.offset().left + colWidth) and refColumn.index() < 7
                    $scope.moveEventObj.start = moment($scope.moveEventObj.start).add("d", 1)
                    $scope.moveEventObj.end = moment($scope.moveEventObj.end).add("d", 1)
        return

    $scope.eventView = (event) ->
        $location.path "event/" + event.id + "/view"
        return

    $scope.isEventAcceptedAll = (event) ->
        allAccepted = true
        if angular.isArray(event.members)
            angular.forEach event.members, (member) ->
                allAccepted = false  unless member.is_invitation_accepted
                return

        allAccepted

    $scope.isNewEvent = (event, user) ->
        isNewEvent = false
        if angular.isArray(event.members)
            angular.forEach event.members, (member) ->
                isNewEvent = true  if member.id is user.id and not member.is_invitation_accepted
                return

        isNewEvent

    $scope.createEmptyEventOnCell = (time, weekday) ->
        eventStart = moment($scope.view.start).startOf("day").add("h", time).add("d", weekday)
        start = eventStart.format()
        end = eventStart.add("h", 1).format()
        $location.path "create/" + start + "/" + end
        return

    $scope.mouseup = ->
        $scope.resizeEventObj = null
        $scope.moveEventObj = null
        return

    $scope.showNotWorkingTime = (index) ->
        $scope.showNotWorkingTime1 = not $scope.showNotWorkingTime1 if index is 1
        $scope.showNotWorkingTime2 = not $scope.showNotWorkingTime2 if index is 2

    return

angular.module("calendar.week").filter "getEventByDay", ->
    (events, startDate) ->
        arr = []
        angular.forEach events, (e) ->
            diff = moment(e.start).startOf("day").diff(moment(startDate).startOf("day"), "days")
            arr.push e  if diff is 0
            return

        arr

angular.module("calendar.week").filter "dateFilter", ->
    (input, format) ->
        moment(input).format format or "LL"

angular.module("calendar.week").filter "timelineWeek", ->
    (startDate, weekday) ->
        string = moment(startDate).add("d", weekday).format "dddd"
        string.charAt(0).toUpperCase() + string.slice(1);

angular.module("calendar.week").filter "timelineDay", ->
    (startDate, weekday) ->
        moment(startDate).add("d", weekday).format "D MMMM"

angular.module("calendar.week").factory "mouse", ->
    location = null
    previousLocation = null
    api =
        getLocation: ->
            angular.copy location

        getPreviousLocation: ->
            angular.copy previousLocation

        setLocation: (x, y) ->
            previousLocation = location  if location
            location =
                x: x
                y: y

            return
    api

angular.module("calendar.week").directive "bnDocumentMousemove", ($document, mouse) ->
    link: ($scope, $element, $attributes) ->
        scopeExpression = $attributes.bnDocumentMousemove
        $document.on "mousemove", (event) ->
            mouse.setLocation event.pageX, event.pageY
            $scope.$apply scopeExpression
            return

        return

angular.module("calendar.week").directive "bnDocumentMouseup", ($document) ->
    link: ($scope, $element, $attributes) ->
        scopeExpression = $attributes.bnDocumentMouseup
        $document.on "mouseup", (event) ->
            $scope.$apply scopeExpression
            return

        return

angular.module("calendar.week").directive "eventTooltip", ->
    scope:
        eventTooltip: "@"

    template: "<div class=\"CalendarWeekRowCellTooltipAligner\"><div class=\"CalendarWeekTooltip\">{{ eventTooltip }}</div></div>"
    replace: false