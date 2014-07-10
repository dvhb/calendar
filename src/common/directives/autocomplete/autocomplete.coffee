angular.module("directives.autocomplete", ["directives/autocomplete/autocomplete.tpl.html"])

angular.module("directives.autocomplete").directive "autocompleteEventInvite", (Users, Events, $timeout, $http, $filter) ->
    restrict: 'EA'
    replace: true
    scope:
        showAutocomplete: "="
        startAt: "@"
        inputFocus: "="
        resultLimit: "@"
        event:"="
        newMembers:"="

    templateUrl: "directives/autocomplete/autocomplete.tpl.html"
    link: ($scope, $element, $attrs) ->
        $input = $element.find("input")
        $input.focus ->
            $("html, body").animate
                scrollTop: $input.offset().top
            , 500
            return

        $scope.startAt = parseInt($scope.startAt, 10) or 2

        filterAction = ($scope) ->
            newVal = $scope.autocompleteQuery

            if _.isEmpty(newVal)
                $scope.result = []
            else
                if newVal.length >= $scope.startAt

                    Users.inviteList(newVal).then (data) ->
                        $scope.result = data
                        $timeout ->
                            $(".autocomplete_item").css width: $input.width() + 14 + "px"

                else
                    $scope.result = []
            return

        filterDelayed = ($scope) ->
            if not $scope.$$phase
                $scope.$apply ($scope) ->
                    filterAction $scope
                    return
            return

        filterThrottled = _.debounce(filterDelayed, 500)
        $timeout ->
            $scope.result = []
            $scope.$watch "autocompleteQuery", ->
                filterThrottled $scope
                return


        #invite members
        $scope.inviteMember = (rec) ->
            sendInvitations = ->
                #send invitation immediately
                Events.update($scope.event).then () ->
                    alertMsg = ""
                    if rec.type == "user"
                        sexPostfix = ((if rec.obj.sex is "F" then "а" else ""))
                        alertMsg = rec.obj.full_name + " был" + sexPostfix + " приглашен" + sexPostfix + " на мероприятие."
                    if rec.type == "group"
                        alertMsg = "Участники «" + rec.obj.name + "» были приглашены на мероприятие."
                    if rec.type == "department"
                        alertMsg = "Сотрудники отдела «" + rec.obj.name_ru + "» были приглашены на мероприятие."

            #alert alertMsg

            $scope.event.members = [] if not angular.isArray $scope.event.members
            $scope.newMembers = []

            if not $scope.loading
                if rec.type == "user"
                    if not $filter('getById')($scope.event.members, rec.obj.id) and $scope.event.author.id != rec.obj.id
                        rec.obj.is_invitation_accepted = false
                        $scope.event.members = $scope.event.members.concat(rec.obj)
                        $scope.newMembers.push(rec.obj)
                        #sendInvitations()

                if rec.type == "group"
                    group_id = rec.id
                    Users.getByGoup(group_id).then (members) ->
                        newInvitations = 0
                        angular.forEach members, (user) ->
                            if not $filter('getById')($scope.event.members, user.id) and $scope.event.author.id != user.id
                                user.is_invitation_accepted = false
                                $scope.event.members = $scope.event.members.concat(user)
                                $scope.newMembers.push(user)
                                newInvitations++

                        #sendInvitations() if newInvitations
                        return

                if rec.type == "department"
                    department_id = rec.id
                    Users.getByDepartment(department_id).then (members) ->
                        newInvitations = 0
                        angular.forEach members, (user) ->
                            if not $filter('getById')($scope.event.members, user.id) and $scope.event.author.id != user.id
                                user.is_invitation_accepted = false
                                $scope.event.members = $scope.event.members.concat(user)
                                $scope.newMembers.push(user)
                                newInvitations++

                        #sendInvitations() if newInvitations
                        return

                $scope.result = []
                $scope.autocompleteQuery = ""
                #$scope.showAutocomplete = false

        return

angular.module("directives.autocomplete").filter "getById", ->
    (input, id) ->
        i = 0
        len = input.length
        while i < len
            return input[i] if input[i].id is id
            i++
        null
