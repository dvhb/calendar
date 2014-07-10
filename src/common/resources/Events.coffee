###
Events MongoDB resource
###
angular.module("common.api.events", ["restangular"])

angular.module("common.api.events").service "Events", ($http, $q, $user, apiEvents) ->
    that = this
    @events = []
    @currentUser = $user

    @updateLocalEvent = (updatedEvent) ->
        angular.forEach that.events, (e, key) ->
            if updatedEvent.id == e.id
                that.events[key] = updatedEvent
                return

    @createEvent = (event) ->
        deferred = $q.defer()

        apiEvents.create(event).then (createdEvent) ->
            deferred.resolve createdEvent
            that.events.push createdEvent
            return

        deferred.promise

    @update = (event) ->
        deferred = $q.defer()

        apiEvents.update(event).then (updatedEvent) ->
            deferred.resolve updatedEvent
            that.updateLocalEvent(updatedEvent)
        deferred.promise

    @remove = (id) ->
        deferred = $q.defer()

        apiEvents.remove(id).then (item) ->
            deferred.resolve(item)
            angular.forEach that.events, (e, key) ->
                if id == e.id
                    that.events.splice(key, 1)
                    return

        deferred.promise

    @getList = ->
        deferred = $q.defer()
        userId = that.currentUser.id

        apiEvents.read(userId).then (data) ->
            that.events = data
            deferred.resolve data
            return

        deferred.promise

    @getOne = (event_id) ->
        deferred = $q.defer()

        apiEvents.one(event_id).then (data) ->
            deferred.resolve data
            return

        deferred.promise

    @refuseMember = (event_id, member_id) ->
        apiEvents.refuseMember(event_id, member_id).then ->
            angular.forEach that.events, (e, index) ->
                if event_id == e.id
                    that.events.splice index, 1
                return

    @acceptMember = (event_id, member_id) ->
        deferred = $q.defer()

        apiEvents.acceptMember(event_id, member_id).then ->
            that.getOne(event_id).then (event) ->
                deferred.resolve event
                that.updateLocalEvent(event)

        deferred.promise

    @inviteMembers = (event_id, members) ->
        apiEvents.inviteMembers(event_id, members).then (event) ->
            that.updateLocalEvent(event)

    return

# Customer api
angular.module("common.api.events").factory "apiEvents", (Restangular) ->
    api = {}
    collection = "events"
    api.read = (authorId) ->
        params =
            fields:
                "name": 1
                "start": 1
                "end": 1
                "author.id": 1
                "author.full_name": 1
                "members.id": 1
                "members.is_invitation_accepted": 1

            query:
                $or: [
                    {
                        "author.id": authorId
                    }
                    {
                        "members.id": authorId
                    }
                ]

        Restangular.several(collection, "?f=" + JSON.stringify(params.fields) + "&q=" + JSON.stringify(params.query)).getList()

    api.update = (model) ->

        #todo dosn't work!
        #return model.save();
        Restangular.one(collection, model.id).customPUT model

    api.one = (id) ->
        Restangular.one(collection, id).get()

    api.remove = (id) ->
        Restangular.one(collection, id).remove()

    api.create = (obj) ->
        Restangular.all(collection).post obj

    api.inviteMembers = (id, newMembers) ->
        #push all new members to members field
        body =
            $push:
                members:
                    $each:
                        newMembers

        Restangular.one(collection, id).customPUT JSON.stringify(body)

    api.refuseMember = (id, member_id) ->
        #remove elements
        body =
            $pull:
                members:
                    id: member_id

        Restangular.one(collection, id).customPUT JSON.stringify(body)

    api.acceptMember = (id, member_id) ->
        query =
            "_id":
                "$oid":id
            "members.id": member_id

        body =
            $set:
                "members.$.is_invitation_accepted": true

        Restangular.all(collection).customPUT(JSON.stringify(body), "", {q:JSON.stringify(query)}, {})

    api
