angular.module("calendar.popup", [
    "calendar/popup/event.view.tpl.html"
    "calendar/popup/event.edit.tpl.html"
    "directives.autocomplete"
])

angular.module("calendar.popup").config ($routeProvider) ->
    $routeProvider
    .when "/event/:eventId/view",
        templateUrl: "calendar/popup/event.view.tpl.html"
        controller: "PopupEventViewCtrl"
        resolve:
            currentEvent: (Events, $route) ->
                Events.getOne($route.current.params.eventId)


    .when "/event/:eventId/edit",
        templateUrl: "calendar/popup/event.edit.tpl.html"
        controller: "PopupEventEditCtrl"
        resolve:
            currentEvent: (Events, $route, $eventPopup) ->
                if $eventPopup.event and $eventPopup.event.id
                    $eventPopup.event
                else
                    Events.getOne($route.current.params.eventId)

    .when "/create/:eventStart/:eventEnd",
        templateUrl: "calendar/popup/event.edit.tpl.html"
        controller: "PopupEventEditCtrl"
        resolve:
            currentEvent: ($eventPopup, $route) ->
                $eventPopup.create($route.current.params.eventStart, $route.current.params.eventEnd)

    .otherwise redirectTo: "/"

    return

angular.module("calendar.popup").service "$eventPopup", ($filter, $rootScope, $location, $user) ->
    that = this

    @width = 380
    @event = {}
    @currentUser = $user

    @isNewEvent = ->
        unless that.event.id
            return true

    @isActive = (event) ->
        return that.event.id == event.id

    # если попап помещается справка
    @isPopupLeft = ->
        if typeof that.event is "object"
            weekday = parseInt(moment(that.event.start).format('d'), 10)
            if weekday > 4 || weekday == 0
                return true

        return

    # если попап помещается справка
    @isPopupRight = ->
        if typeof that.event is "object"
            weekday = parseInt(moment(that.event.start).format('d'), 10)
            if weekday <= 4 && weekday != 0
                return true

        return

    @getLeft = ->
        unless that.event.start
            return

        refColumn = $('[data-weekday="' + moment(that.event.start).format('d') + '"]')
        eventleft = refColumn.position().left
        eventWidth = refColumn.width() + 1

        isLeft = that.isPopupLeft()
        isRight = that.isPopupRight()

        if isLeft
            return eventleft - that.width - 15
        if isRight
            return eventleft + eventWidth + 15

    @getTop = ->
        unless that.event.start
            return

        refRow = $('[data-hour="' + moment(that.event.start).format('H') + '"]')
        top = (refRow.position().top) + Math.round((refRow.outerHeight() / 60) * moment(that.event.start).format('mm'))
        return top

    @getOne = ->
        return that.event

    # Создадим пустое событие
    @create = (eventStart, eventEnd) ->
        that.event =
            author: that.currentUser
            name: ""
            start: eventStart
            end: eventEnd

    @destroy = ->
        $rootScope.$broadcast "eventPopup.destroy", that.event;
        that.event = {}
        $location.path("/")
        return

    @edit = (eventId) ->
        $location.path("event/" + eventId + "/edit")
        return

    @isEditable = ->
        that.event.author.id == $user.id if that.event and that.event.author

    @isAcceptedEvent = (event) ->
        event = that.event if not event
        isAcceptedEvent = $filter('isAcceptedEvent')(event)
        isAcceptedEvent
    return

angular.module("calendar.popup").directive "scrollToPopup", ($timeout) ->
    link: (scope, element, attr) ->
        $timeout ->
            $("html, body").animate
                scrollTop: element.offset().top - 100
            , 1000
        return

angular.module("calendar.popup").directive "popupPosition", ($timeout, $eventPopup) ->
    link: (scope, element, attr) ->
        if $(".trip-overlay").length
            element.css "z-index", "inherit"
        else
            element.css "z-index", "1001"

        element.css "left", $eventPopup.getLeft()
        element.css "top", $eventPopup.getTop()

        element.addClass "CalendarPopupRight", $eventPopup.isPopupLeft() if $eventPopup.isPopupLeft()
        element.addClass "CalendarPopupLeft", $eventPopup.isPopupRight() if $eventPopup.isPopupRight()
        return

angular.module("calendar.popup").directive "dateToTime", ->
    restrict: "A"
    require: "ngModel"
    link: (scope, element, attr, ngModel) ->
        fromUser = (time) ->
            if time isnt `undefined`
                currentDate = attr.currentDate
                hour = parseInt(time.split(":")[0], 10)
                minutes = parseInt(time.split(":")[1], 10)
                date = moment(currentDate).hour(hour).minutes(minutes).format()
                date

        toUser = (date) ->
            attr.currentDate = date
            if date isnt `undefined`
                time = moment(date).format("HH") + ":" + moment(date).format("mm")
                time

        ngModel.$parsers.push fromUser
        ngModel.$formatters.push toUser
        return

angular.module("calendar.popup").filter "membersAccepted", ->
    (items, isAccepted) ->
        arr = []
        if angular.isArray(items)
            i = 0
            while i < items.length
                if items[i].is_invitation_accepted == isAccepted
                    arr.push items[i]
                i++
        arr

angular.module("calendar.popup").controller "CalendarCtrl", ($scope, Events, $cookieStore) ->
    unless Events.events.length
        Events.getList().then (data) ->
            $scope.events = data

    #toggle month calendar
    $scope.showMonthCalendar = true
    $scope.showMonthCalendar = $cookieStore.get("showMonthCalendar") if $cookieStore.get("showMonthCalendar") isnt `undefined`
    $scope.$watch "showMonthCalendar", (newVal) ->
        $cookieStore.put("showMonthCalendar", newVal)
        return

    return

angular.module("calendar.popup").controller "PopupEventViewCtrl", ($rootScope, $scope, $eventPopup, Events, $http, $filter, currentEvent, $location, $user) ->
    $rootScope.$broadcast 'eventPopup.view', currentEvent

    $scope.$eventPopup = $eventPopup
    $scope.showAutocomplete = false

    if currentEvent
        $eventPopup.event = currentEvent

    $scope.event = $eventPopup.getOne()

    $scope.$watch "event.members", ((members) ->
        $scope.notAcceptedMembers = $filter("membersAccepted")(members, false)
        $scope.acceptedMembers = $filter("membersAccepted")(members, true)
    ), true

    $scope.edit = ->
        $eventPopup.edit($scope.event.id)
        return

    $scope.cancel = ->
        $eventPopup.destroy()
        return

    $scope.acceptEvent = ->
        member_id = $user.id
        event_id = $scope.event.id
        Events.acceptMember(event_id, member_id).then (updatedEvent) ->
            #todo use only $eventPopup not $scope.event
            $scope.event = updatedEvent
            $eventPopup.event = updatedEvent
            return
        return

    $scope.refuseEvent = (showAlert) ->
        refuse = ->
            member_id = $user.id
            event_id = $scope.event.id
            Events.refuseMember(event_id, member_id).then () ->
                $scope.cancel()
                $rootScope.$broadcast 'eventPopup.refuseEvent'
            return

        #todo i18 support
        #if confirm 'Do you really want to refuse event??'
        refuse()

        return

    $scope.newMembers = []
    #insert only new members
    $scope.$watch "newMembers", (new_members) ->
        if angular.isArray(new_members) and new_members.length
            Events.inviteMembers($scope.event.id, new_members).then () ->
                $scope.showAutocomplete = false
    , true

    return

angular.module("calendar.popup").controller "PopupEventEditCtrl", ($scope, $eventPopup, Events, $http, $filter, currentEvent, $location, $user) ->
    $scope.$eventPopup = $eventPopup

    if currentEvent
        $eventPopup.event = currentEvent

    $scope.event = angular.copy $eventPopup.event

    $scope.$watch "event.members", ((members) ->
        $scope.notAcceptedMembers = $filter("membersAccepted")(members, false)
        $scope.acceptedMembers = $filter("membersAccepted")(members, true)
    ), true

    $scope.date_start = moment($scope.event.start).format("L")
    $scope.$watch "date_start", (val) ->
        if angular.isDefined(val) && val
            dateStart = $scope.event.start
            dateEnd = $scope.event.end
            $scope.event.start = moment(val, "DD-MM-YYYY").hour(moment(dateStart).format("HH")).minutes(moment(dateStart).format("mm")).format()
            $scope.event.end = moment(val, "DD-MM-YYYY").hour(moment(dateEnd).format("HH")).minutes(moment(dateEnd).format("mm")).format()
            return

    $scope.submit = ->
        event = $scope.event

        $scope.myForm.$setValidity("wrong_interval", true)
        $scope.myForm.$setValidity("duplicate", true)

        #check duplicate events
        Events.events.forEach (e) ->
            if e.start == event.start and not event.id
                $scope.myForm.$setValidity("duplicate", false)

        if moment(event.end).diff(moment(event.start), 'minutes') < 30
            $scope.myForm.$setValidity("wrong_interval", false)

        if not $scope.myForm.$invalid
            $scope.loading = true

            if event.id
                # update event
                Events.update(event).then () ->
                    $scope.cancel()
                    $scope.loading = false
            else
                # create new event
                Events.createEvent(event).then () ->
                    $scope.cancel()
                    $scope.loading = false
                return

        return

    $scope.cancel = ->
        $eventPopup.destroy()
        return

    $scope.remove = (eventId) ->
        #todo i18 support
        #if confirm 'Do you really want to cancel the event and send a notice email?'

        Events.remove(eventId).then () ->
            $eventPopup.destroy()
        return

    $scope.showAutocomplete = true

    $scope.event.membersForInvite = [] #for invite only new members array
    $scope.event.membersForRemove = [] #for remove only removed members

    $scope.newMembers = []

    #insert only new members
    $scope.$watch "newMembers", (new_members) ->
        if angular.isArray(new_members) and new_members.length
            $scope.event.membersForInvite = $scope.event.membersForInvite.concat(new_members)
    , true

    $scope.removeMember = (removedMember) ->
        angular.forEach $scope.event.members, (member, index) ->
            if (removedMember.id == member.id)
                $scope.event.members.splice index, 1
                $scope.event.membersForRemove.push(member)

    # input important fields (name & event date)
    $scope.inputImportantFields = ->
        form = $scope.myForm
        form.name.$valid and not form.time_start.$error.required and not form.time_end.$error.required and form.date_start.$valid
    return
