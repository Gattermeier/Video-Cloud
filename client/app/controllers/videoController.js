angular.module('app.video', [])
  .controller('videoController', function($scope, $rootScope, $http, $window, $timeout, commentService, $routeParams, $location, commentGraph) {

    /***********INIT**********/
    $('#videoContainer').show();
    // $location.hash('title'); //cannot use because it causes controller code to execute twice
    $window.scrollTo(0, 0); //scroll to top of page

    var videoId = $routeParams.videoId || 'nS68JH9lFEs';
    $scope.videoId = videoId;
    // var socket = io.connect("http://127.0.0.1:3000/"); // dev: route must change for deployment

    // func: socket emits init event to tell server the video selected
    socket.emit('cs-init-video', {
      videoId: videoId
    }); //dev: videoId will be variable


    // func: server responds to cs-init-video with sc-init-video containing video data
    socket.on('sc-init-video', function(videoData) {
      console.log("SocketIO is a success! data = ", videoData);
      if (!videoData.video) {
        $scope.comments = [];
      } else {
        $scope.comments = videoData.video.comments;
      } //if

      // comment graph setup
      commentGraph.graph(videoData.video);
      $(window).on('resize', commentGraph.resize.bind(null, videoData.video));
      // commentGraph.hide();
      commentGraph.clicked(videoData.video, function(item) {
        // console.log('time='+item);
        $window.player.seekTo(item);

      });
      // var timer = commentGraph.timer(videoData.video);
      // var t = timer.timer();
      // console.log('=====================',timer)

      // setTimeout(timer.stop.bind(timer), 1000);
    });


    /*********LOGIN*********/
    // // func: server responds to cs-init-video with sc-init-user containing video data
    if ($window.user === undefined) { //only check the first time. 
      socket.emit('cs-init-user', {});

      socket.on('sc-init-user', function(userData) {
        console.log("TEST ---> sc-init-user. User = ", userData);
        // save the logged in user to the window object. see contract.md to see details.
        $window.user = userData.user;

        // if(userData.logged_in){ //redirect if logged_in
        //   console.log("Logged in!!!");

        //   $rootScope.$apply(function(){ //forcing a re-render
        //     $location.path('/home');
        //   }); //rootScope.apply()
        // } //if(logged_in)
      }); //sc-init-user
    } //if

    /*********CONTROLLERS*********/
    $scope.submitComment = function() {
      if ($window.user.logged_in) {
        // func: get current video time
        var comment = {
          userId: $window.user._id,
          username: $window.user.username,
          videoId: videoId,
          text: $scope.comment,
          timestamp: $window.player.getCurrentTime()
        };

        // console.log('submitComment. comment=',comment);

        socket.emit('cs-comment', comment); //dev: videoId will be variable
        $scope.comment = ''; //reset comment input
      } else {
        alert("You must login before submitting a comment. Thanks!");
      } //if(logged_in)
    }; //submitComment()

    /*********SOCKET LISTENERS*********/
    // NOTE: the following listeners should only be instantiated once, hence the use of the 
    //      commentInit variable. 
    if ($window.commentInit === undefined) {
      // if server saves a submitted comment correctly, server broadcasts the new comment to entire namespace
      socket.on('sc-comment new', function(comment) {
        // todo: add new comment to scrolling output?
        console.log("TEST ---> new comment");
        $scope.comments.push(comment);
        commentService.displayComment(comment);
      }); //sc-comment

      // error handling in case the submitted comment could not be handled by server
      socket.on('sc-comment error', function(error) {
        console.log('something went wrong, the comment could not be saved', error);
      }); //sc-comment

      // func: server responds to cs-init-video with sc-init-video containing video data
      socket.on('sc-init-video', function(videoData) {
        console.log("SocketIO is a success! data = ", videoData);
        if (!videoData.video) {
          $scope.comments = [];
        } else {
          $scope.comments = videoData.video.comments;
        } //if

        // comment graph setup
        commentGraph.graph(videoData.video);
        $(window).on('resize', commentGraph.resize.bind(null, $scope.comments));
        // commentGraph.hide();
        commentGraph.clicked(videoData.video, function(item) {
          // console.log('time='+item);
          $window.player.seekTo(item);
        });
      });

      $window.commentInit = true;
    } //if(!commentInit)

    /*********VIDEO CONTROLS*********/
    //NOTE: delayed to wait for page load

    // func: test videoId on player first
    // if (player !== undefined) {
    // } //if(player)
    $timeout(function() {
      console.log("TEST1 ----> run once");
      var player = $window.player;

      if (player !== undefined) {
        // console.log('TEST1 ---> getVideoData works');
        var existingVideo = player.getVideoData(); //get video information {video_id, author, title}
      } else {
        // console.log('TEST1 ---> getVideoData not work');
        existingVideo = {
          video_id: videoId,
          author: "",
          title: ""
        };
      } //if()

      console.log("TEST1 --------------> existingVideo=", existingVideo);

      //note: only load video if it is new
      if (existingVideo.video_id !== videoId) { //new video being loaded
        console.log("TEST1 -----> loadVideoById()");
        player.loadVideoById(videoId); //load new video by video_id
      } else { // play existing video
        console.log("TEST1 -----> playVideo()");
        player.playVideo();

      } //if(existingVideoId !== videoId)


      //func: detect state change of video
      // -> 1st load new video: emit cs-videoLoad via SocketIO
      // -> Pause and play at new location: clear commentScroller
      if ($window.videoInit === undefined) { //even listeners only add once
        $window.player.addEventListener('onStateChange', function(event) {
          var e = event.data;
          if (e === -1) { //unstarted
          } else if (e === 0) { //ended
          } else if (e === 1) { //playing: re-establish setTimouts(comments)
            console.log("TEST: VIDEO PLAYING");

            $("#commentContainer").html(''); //reset commentContainer

            //NOTE: This is when the video data actually becomes available.  
            var currentTime = $window.player.getCurrentTime();
            $scope.promises = commentService.makePromises($scope.comments, currentTime);

            /*** Show prev. comments ***/
            // console.log();

            /*** Save Video ***/
            var videoData = player.getVideoData(); //get video information {video_id, author, title}
            $window.video = $window.video || {};
            //func: emit videoLoad event if id has changed. 
            if ($window.video.videoId !== videoData.video_id) {
              var video = {
                videoTitle: videoData.title,
                videoId: videoData.video_id,
                videoDuration: player.getDuration()
              };

              $window.video = video; //reset window.video object
              socket.emit('cs-videoLoad', video); //dev: videoId will be variable
            } else { //video has been loaded before
              //func: clear commentContainer  
              // $("#commentContainer").html('');

            } //if (video being played first time)

          } else if (e === 2) { //paused: cancel all setTimouts(comments)
            console.log("TEST: VIDEO PAUSED");
            commentService.killPromises($scope.promises);
          } else if (e === 3) { //buffering
            // console.log("TEST: VIDEO BUFFERING");
          } else if (e === 5) { //video cued
          } //if(e)
        }); //addEvenListener

        $window.videoInit = true;
      } //if(!window.videoInit)
    }, function() {
      return $window.homepageLoaded ? 0 : 2000;
    }()); //$timeout: 

  }).factory('commentService', function($timeout, $window) { //
    // func: create setTimeouts to display comments in the future
    var makePromises = function(comments, currentTime) {
        // order comments based on chronological order
        comments.sort(function(a, b) {
          return a.timestamp - b.timestamp;
        }); //comments.sort

        var promises = []; //array which holds the handles for setTimeouts 
        // console.log("Inside makePromises(). comments=", comments);
        for (var i = 0; i < comments.length; i++) {
          var comment = comments[i];
          var timestamp = comment.timestamp; //relative time position of comment
          var delay = timestamp - currentTime; //time between comment time and current time in video

          if (delay <= 0) { //post comment right away if in the past (or present)
            displayComment(comment);

          } else { //post comment with delay if in the future
            var promise = $timeout(function(comment) { //decorator function creates custom closure for text variable
              return function() { //display comment!
                displayComment(comment);
              }
            }(comment), delay * 1000);

            promises.push(promise);
          } //if
        } //for(comments)
        return promises;
      } //makePromises()

    // func: cancels setTimeouts which have been previously set. 
    var killPromises = function(promises) {
        // console.log('inside killPromises. promises=', promises);
        // $("#commentContainer").html('');
        for (var i = 0; i < promises.length; i++) {
          $timeout.cancel(promises[i]); //cancel all promises
        } //for(promises)
      } //killPromises()

    var displayComment = function(comment) {
        var username = comment.username || "Anonymouse";
        var timestamp = toHMS(Math.round(comment.timestamp)); //func: beautify time
        var content = "(" + timestamp + ") " + username + ": " + comment.text;
        var $comment = $("<div class='textBubble'>" + content + "</div>")
        if (username === $window.user.username) { //message belongs to current user
          $comment.addClass('belongsToUser');
        } //if

        $("#commentContainer").prepend($comment);
      } //displayComment


    var toHMS = function(seconds) {
        var hours = Math.floor(seconds / 3600);
        var minutes = Math.floor((seconds - (hours * 3600)) / 60);
        var seconds = seconds - (hours * 3600) - (minutes * 60);

        if (hours < 10) {
          hours = "0" + hours;
        }
        if (minutes < 10) {
          minutes = "0" + minutes;
        }
        if (seconds < 10) {
          seconds = "0" + seconds;
        }
        var time = hours + ':' + minutes + ':' + seconds;
        return time;
      } //toHMS()

    // var clearContent = function()

    return {
      makePromises: makePromises,
      killPromises: killPromises,
      displayComment: displayComment
    };
  });
