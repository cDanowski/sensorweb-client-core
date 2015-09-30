angular.module('n52.core.table', ['n52.core.timeseries', 'ngTable'])
        .controller('tableController', ['$scope', '$filter', 'ngTableParams', 'timeseriesService',
            function ($scope, $filter, ngTableParams, timeseriesService) {
                // http://ngmodules.org/modules/ng-table
                createValueArray = function () {
                    var array = [];
                    var map = {};
                    var count = 0;
                    angular.forEach(timeseriesService.getAllTimeseries(), function (ts) {
                        var data = timeseriesService.getData(ts.internalId);
                        if (data.values.length > 0) {
//                        var values = removeOverlappingValues(ts.getValues());
                            var values = data.values;
                            angular.forEach(values, function (pair) {
                                var time = pair[0];
                                var value = pair[1];
                                if (!map[time]) {
                                    map[time] = {
                                        time: time
                                    };
                                }
                                map[time][ts.internalId] = value;
                            });
                        }
                        count++;
                    });
                    var i = 0;
                    angular.forEach(map, function (entry, idx) {
                        array[i++] = entry;
                    });
                    return array;
                };

                createColumns = function () {
                    var columns = [];
                    columns.push({
                        phenomenon: 'Zeit', field: 'time', visible: true
                    });
                    angular.forEach(timeseriesService.getAllTimeseries(), function (ts) {
                        columns.push({
                            station: ts.parameters.feature.label,
                            phenomenon: ts.parameters.phenomenon.label + " (" + ts.uom + ")",
                            field: ts.internalId,
                            color: ts.styles.color
                        });
                    });
                    return columns;
                };

                createTable = function () {
                    $scope.tableParams = new ngTableParams({
                        page: 1,
                        count: 30,
                        sorting: {
                            time: 'asc'
                        }
                    }, {
                        total: data.length,
                        counts: [],
                        getData: function ($defer, params) {
                            var orderedData = params.sorting() ?
                                    $filter('orderBy')(data, params.orderBy()) :
                                    data;
                            $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                        }
                    });
                };

                removeOverlappingValues = function (values) {
                    // remove values before start
                    var start = TimeController.getCurrentStartAsMillis();
                    var count = 0;
                    while (values[count][0] < start)
                        count++;
                    values.splice(0, count);
                    // remove values after the end
                    var idx = values.length - 1;
                    var end = TimeController.getCurrentEndAsMillis();
                    count = 0;
                    while (values[idx][0] > end) {
                        count++;
                        idx--;
                    }
                    values.splice(++idx, count);
                    return values;
                };

                $scope.loadMoreData = function () {
                    $scope.tableParams.count($scope.tableParams.count() + 10);
                    $scope.tableParams.reload();
                };

                $scope.$on('timeseriesChanged', function (evt, id) {
                    data = createValueArray();
                    $scope.columns = createColumns();
                });

                $scope.$on('timeseriesDataChanged', function (evt, id) {
                    data = createValueArray();
                    $scope.columns = createColumns();
                    createTable();
                });

                $scope.columns = createColumns();

                var data = createValueArray();
                createTable();
            }])
        .directive('whenScrollEnds', function () {
            return {
                restrict: "A",
                link: function (scope, element, attrs) {
                    findParentHeightElement = function (elem) {
                        if (elem.height() > 0) {
                            return elem;
                        } else {
                            return findParentHeightElement(elem.parent());
                        }
                    };

                    var parent = findParentHeightElement(element);
                    var visibleHeight = parent.height();
                    var threshold = 100;

                    parent.scroll(function () {
                        var scrollableHeight = parent.prop('scrollHeight');
                        var hiddenContentHeight = scrollableHeight - visibleHeight;

                        if (hiddenContentHeight - parent.scrollTop() <= threshold) {
                            // Scroll is almost at the bottom. Loading more rows
                            scope.$apply(attrs.whenScrollEnds);
                        }
                    });
                }
            };
        });