app.controller('RidesCtrl', ['$scope', '$q', '$compile', '$http', 'dateFilter',
    'DTOptionsBuilder', 'DTColumnBuilder', '$state', '$timeout', 'NgMap',
    function ($scope, $q, $compile, $http, dateFilter,
        DTOptionsBuilder, DTColumnBuilder, $state, $timeout, NgMap) {

        var _watcherRemovers = [];
        
        $scope.isLoading = false;
        $scope.pgSizes = ["5", "10", "15", "20", "25"];
        $scope.pgSize = $scope.pgSizes[0];
        $scope.refresh = true;
        $scope.currentView = "table";

        $scope.mapMarkers = [];

        $scope.getRides = function(max, offset, refresh) {
            var params = {
                max: max,
                offset: offset,
                refresh: refresh
            };

            return $http.get('rides', {
                params: params
            });
        };

        $scope.getAllRides = function(refresh) {
            var params = {
                max: 500,
                offset: 0,
                refresh: refresh
            };

            $scope.mapMarkers = [];
            return $http.get('rides', {
                params: params
            }).then(function (resp) {
                angular.forEach(resp.data.records, function (rec, i) {
                    $scope.mapMarkers.push({
                        pos: [rec.startCity.lat, rec.startCity.lng],
                        name: rec.startCity.name
                    });
                });

                // Resize map after first redraw
                var timer = $timeout(function () {
                    NgMap.getMap().then(function (map) {
                        var center = map.getCenter();
                        google.maps.event.trigger(map, "resize");
                        map.setCenter(center);
                    });
                }).then(function () {
                    $timeout.cancel(timer);
                });
                return resp;
            });
        };

        $scope.changeView = function(newView) {
            if (newView === 'map') {
                $scope.getAllRides(false);
            }
            $scope.currentView = newView;
        };

        $scope.syncMap = function() {
            $scope.getAllRides(true);
        };

        /**** Table related code - START ****/

        $scope.refreshTable = function(newPgSize, isSync) {
            $scope.refresh = true;
            $scope.dtInstance.DataTable.page.len(newPgSize || $scope.pgSize);
            $scope.dtInstance.reloadData(null, true);
        };

        function createdRow(row) {
            // Recompiling so we can bind Angular directive to the DT
            $compile(angular.element(row).contents())($scope);
        }

        $scope.dtOptions =DTOptionsBuilder.newOptions()
        .withOption('ajax', function (data, callback) {
            $scope.getRides(data.length, data.start, $scope.refresh).then(function(r){
                $scope.refresh = false;
                callback({
                    draw: data.draw,
                    recordsTotal: r.data.totalRecords,
                    recordsFiltered: r.data.totalRecords,
                    data: r.data.records
                });
            }, function(){
                callback({
                    draw: data.draw,
                    recordsTotal: 0,
                    recordsFiltered: 0,
                    data: [],
                    error: 'Unknown error occured !'
                });
            });
        })
        .withDataProp('data')
        .withOption('processing', true)
        .withOption('serverSide', true)
        .withDisplayLength($scope.pgSize)
        .withDOM("t<'row-fluid datatables_footer'<'span12'pi>>r")
        .withLanguage({ 
            "sEmptyTable": "No records found !", 
            "sInfo": "Showing _START_ to _END_ of _TOTAL_ Rides", 
            "sInfoEmpty": "", 
            "sInfoFiltered": "(filtered from _MAX_ total Rides)", 
            "sInfoPostFix": "", 
            "sInfoThousands": ",", 
            "sLoadingRecords": "Loading...", 
            "sProcessing": '<div class="outer"><div class="middle"><div class="inner"><img src="assets/img/throbber.svg" width="16" height="16" alt=""/></div></div></div>', 
            "sSearch": "Search:", 
            "sZeroRecords": "No matching records found", 
            "oPaginate": { 
                "sFirst": "First", 
                "sLast": "Last", 
                "sNext": ">", 
                "sPrevious": "<" 
            }, 
        })
        .withOption('createdRow', createdRow)
        .withOption('headerCallback', function(header) {
            if (!$scope.headerCompiled) {
                // Use this headerCompiled field to only compile header once
                $scope.headerCompiled = true;
                $compile(angular.element(header).contents())($scope);
            }
        });
        $scope.dtColumns = [ 
            DTColumnBuilder.newColumn('requestTime').withTitle('Ride Request')
            .renderWith(function(data, type, full){
                return dateFilter(full.requestTime, "short");
            }).notSortable(),
            DTColumnBuilder.newColumn('startTime').withTitle('Ride Start')
            .renderWith(function(data, type, full){
                return dateFilter(full.startTime, "short");
            }).notSortable(),
            DTColumnBuilder.newColumn('endTime').withTitle('Ride End')
            .renderWith(function(data, type, full){
                return dateFilter(full.endTime, "short");
            }).notSortable(),
            DTColumnBuilder.newColumn('distance').withTitle('Distance (in Miles)').withOption("defaultContent", "").notSortable(),
            DTColumnBuilder.newColumn('startCity.name').withTitle('City').withOption("defaultContent", "").notSortable()
        ];
        $scope.dtInstance = {};

        /**** Table related code - END ****/

        // Destroy handler
        $scope.$on('$destroy', function(){
            angular.forEach(_watcherRemovers, function(val){
                val();
            });
        });
    }
]);