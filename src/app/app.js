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