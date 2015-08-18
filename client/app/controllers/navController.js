angular.module('app.nav', [])
  .controller('navController', function($scope, $location, $window) {
    $scope.loggedin = false;
    socket.emit('cs-init-user');

    socket.on('sc-init-user', function(data) {
      if (data.logged_in) {
        $window.user = data.user;
        $window.user.logged_in = data.logged_in;
        $scope.$apply(function() {
          $scope.loggedin = true;
        });
      } else {
        $window.user = undefined;
        $scope.$apply(function() {
          $scope.loggedin = false;
        });
      }
    });

    $scope.loadVideo = function() {
        console.log("TEST inside loadVideo");

        var videoData = $window.player.getVideoData();
        if (videoData !== undefined) {
          $location.path('/video/' + videoData.video_id);
        } //if

      } //loadVideo()
  }); //navController
