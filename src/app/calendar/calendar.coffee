angular.module("calendar", [
    "calendar.popup"
    "calendar.months"
    "calendar.week"
    "calendar/calendar.tpl.html"
])

angular.module("calendar").factory "CalendarData", ->
    activeDay: {}

angular.module("calendar").value "calendarConfig",
    step: 30
    workTime: [
        9
        18
    ]
    moveEvents: false

angular.module('calendar').filter "plural", ->
    (n, forms) ->
        forms = forms.split(',')
        n %= 100
        if n > 10 && n < 20
            return forms[2];
        n %= 10
        if n > 1 && n < 5
            return forms[1]
        if n == 1
            return forms[0]
        return forms[2]

angular.module('calendar').filter "isAcceptedEvent", ($user) ->
    (event) ->
        isAcceptedEvent = true
        if angular.isArray(event.members)
            angular.forEach event.members, (member) ->
                if member.id == $user.id and not member.is_invitation_accepted
                    isAcceptedEvent = false
                    return
        isAcceptedEvent

angular.module("calendar").filter "capitalize", ->
    (input) ->
        input.charAt(0).toUpperCase() + input.slice(1)

# moment.js customizations
moment.lang moment.lang(),
    week:
        dow: 1 # Monday is the first day of the week.
        doy: 7 # The week that contains Jan 1st is the first week of the year.
