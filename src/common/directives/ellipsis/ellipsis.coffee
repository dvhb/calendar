angular.module("directives.ellipsis", ["directives/ellipsis/ellipsis.tpl.html"])


angular.module("directives.ellipsis").directive "mlEllipsis", ->
    restrict: "EA"
    transclude: true
    scope:
        ellipsis: "="
        ellipsisUrl: "="
        ellipsisStyle: "="

    templateUrl: "directives/ellipsis/ellipsis.tpl.html"

angular.module("directives.ellipsis").directive "mlEllipsisExcludeFromIsolated", ->
    restrict: "ea"
    require: "^mlEllipsis"
    scope: false
    link: [
        "$transclude"
        ($scope, $element, $attrs, $transclude) ->
            $transclude $scope.$parent, (clone) ->
                $element.empty()
                $element.append clone
                return

    ]