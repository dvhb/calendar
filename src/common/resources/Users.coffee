###
Users MongoDB resource
###
angular.module("common.api.users", ["restangular"])

angular.module("common.api.users").service "Users", ($http, $q, Restangular) ->
    that = this
    collection = "users"

    @getByGoup = (group_id) ->
       []

    @getByDepartment = (department_id) ->
        []

    @inviteList = (query) ->
        deferred = $q.defer()

        params =
            q:
                "full_name":
                    $regex: query
                    $options: "i"

        Restangular.all(collection).getList({q:JSON.stringify(params.q)}).then (rawData) ->
            data = []
            rawData.forEach (row) ->
                data.push({type:"user", obj:row})
            deferred.resolve data

        deferred.promise

    return