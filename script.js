// BDD
const SUPABASE_URL = 'https://ggunnirdsnplfaytkcff.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdndW5uaXJkc25wbGZheXRrY2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA0NDI2NjgsImV4cCI6MjAzNjAxODY2OH0.mZpr2HTGVEWs_xt47Ffk80zAwpJWp-1Hu6iR96OJYUw';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

var USERNAME = window.localStorage.getItem("username") || '';
var USERKEY = window.localStorage.getItem("userkey") || '';

const APIController = (function() {
    const nip = String.fromCharCode(56, 54, 100, 100, 102, 98, 49, 51, 55, 49, 102, 52, 52, 48, 50, 56, 56, 52, 56, 54, 102, 100, 56, 54, 100, 53, 53, 53, 51, 98, 54, 98);
    const tuc = String.fromCharCode(99, 56, 50, 53, 102, 55, 54, 97, 100, 54, 50, 101, 52, 97, 55, 101, 56, 98, 51, 52, 48, 54, 54, 48, 55, 56, 57, 53, 101, 101, 48, 97);

    // private methods
    const _getToken = async () => {

        const result = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type' : 'application/x-www-form-urlencoded', 
                'Authorization' : 'Basic ' + btoa(nip + ':' + tuc)
            },
            body: 'grant_type=client_credentials'
        });

        const data = await result.json();
        return data.access_token;
    }

    const _getPlaylist = async(token) => {
        const result = await fetch('https://api.spotify.com/v1/playlists/6MiBYhSbLxGXfNcc5ZzNj8?market=FR', {
            method: 'GET',
            headers: { 'Authorization' : 'Bearer ' + token}
        });
        const data = await result.json();
        return data.tracks;
    }

    return {
        getToken() {
            return _getToken();
        },
        getPlaylist(token) {
            return _getPlaylist(token);
        }
    }
})();


// UI Module
const UIController = (function() {

    //object to hold references to html selectors
    const DOMElements = {
        hfToken: '#hidden_token',
    }

    //public methods
    return {
        
        storeToken(value) {
            document.querySelector(DOMElements.hfToken).value = value;
        },

        getStoredToken() {
            return {
                token: document.querySelector(DOMElements.hfToken).value
            }
        }
    }

})();

const APPController = (function(UICtrl, APICtrl) {    

    // GAME LOGIC
    const SHUFFLE = true;
    const DEVMODE = false;
    const PRODMODE = false;
    const DEFAULTANSWERSAMOUNT = 4;
    const DIFFICULTYNAMES = ['Normal', 'Difficile', 'Infernal', 'Extrême'];
    var MINSTREAK = 3;
    var TRACKSBYGAME = 40;
    var ANSWERSAMOUNT = 4;
    var DIFFICULTYLEVEL = 1;
    var DISPLAYTRACKSINFOS = true;
    var DEFAULTTRACKDURATION = 30;
    var HARDCOREMODETRACKDURATION = 5;
    var TRACKSTART = 0;
    var DISPLAYAVATARS = false;
    var POINTSBYANSWER = 1;
    var POINTSMULTIPLICATOR = 1;
    var streak = 0;
    var streakBonus = 0;
    var tracks = {};
    var isPlaying = false;
    var answers = [];
    var score = 0;
    var playedTracks = 0;
    var currentTrack = 0;
    var z = String.fromCharCode;
    var audioPlayer = document.getElementById("audio_player");
    var jsAudioPlayer = $('.js-audio-player');
    var soundRight = new Audio('assets/right.m4a');
    var soundWrong = new Audio('assets/wrong.m4a');
    // Data
    var playersData = [];
    var playersDataBuild = '';
    var tracksByPlayer = 0;
    var playersAmount = 0;
    var playerIndexes = [];
    getGameData().then(function(result) {
        playersData = result;
        playersDataBuild = JSON.parse(JSON.stringify(playersData));
        tracksByPlayer = Math.floor(TRACKSBYGAME / playersData.length);
        playersAmount = playersData.length;
        playerIndexes= [...Array(playersAmount).keys()];
        $('.js-nb-options').attr('max', playersAmount);
    });
    var setList = [];
    var tracksIndexes = [];
    var setListLength = 0;
    var minScore = 0;
    // Player data
    var playerData = {};

    function buildSetlist() {
        resetCountdownBar();

        if(SHUFFLE) {
            // Shuffle players tracks index
            for(player in playersDataBuild) {
                playersDataBuild[player][1] = shuffleArray(playersDataBuild[player][1]);
            }
            // Shuffle players
            playersDataBuild = shuffleArray(playersDataBuild);
            /*console.log(playersDataBuild);*/
        }

        // playerIndexes.pop();

        // Build setlist from players traks
        for(player in playersDataBuild) {

            if(DEVMODE) {
                // ALL TRACKS
                for(track in playersDataBuild[player][1])
                    setList.push([playersDataBuild[player][0], playersDataBuild[player][1][track]]);
            }
            else {
                // N TRACKS BY PLAYER
                for(let i=0; i<tracksByPlayer; i++) {
                    // var index = i;
                    // var trackIndex = playersDataBuild[player][1][index];
                    if(playersDataBuild[player][1].length == 0)
                        break;
                    addToSetlist(playersDataBuild[player]);
                }
            }
        }
        // Remainder tracks to fill setlist
        while(setList.length < TRACKSBYGAME && setList.length < tracks.items.length && playersDataBuild.length > 0) {
            playersDataBuild = shuffleArray(playersDataBuild);
            if(playersDataBuild[0][1].length == 0) {
                playersDataBuild.shift();
            }
            else {
                addToSetlist(playersDataBuild[0]);
            }
        }
        if(SHUFFLE) {
            setList = shuffleArray(setList);
        }
        setListLength = setList.length;        
        $('.js-track-total').text(setListLength);
        minScore = setListLength - setListLength / 5;
    }

    function addToSetlist(player) {
        var playerName = player[0];
        var trackIndex = player[1].pop();
        // Check if track is already in array (avoid having same track more than 1 time in case of track chosen by multiple players)
        if(tracksIndexes.includes(trackIndex)) {
            return;
            // trackIndex = player[1].pop();
        }
        tracksIndexes.push(trackIndex);
        var data = [playerName, trackIndex];
        setList.push(data);
    }

    // get playlist on page load
    const loadPlaylist = async () => {
        //get the token
        const token = await APICtrl.getToken();           
        //store the token onto the page
        UICtrl.storeToken(token);
        //get playlist
        tracks = await APICtrl.getPlaylist(token);
        if(DEVMODE) {
	        for(track of tracks.items) {
	            console.log(tracks.items.indexOf(track) + 1);
	            console.log(track.track.preview_url);
	            console.log(track.track.id);
                console.log('----------');
	        }
	    }
        // buildSetlist();
        /*console.log(tracks);*/
        // totalTracks = tracks.total;        
        getPlayerData().then(function(result) {
            if(result.id != null) {
                playerData = result;                
                getScores().then(function(result) {
                    playerData.scores = result[0].scores || [];
                });
                $('.js-settings').addClass('visible');
                $('.js-bar-top').addClass('visible');
                $('.js-login').removeClass('visible');
            }
            $('#wrapper').addClass('initialized');
        });
    }

    // DOMInputs.playTrackButton.addEventListener('click', async (e) => {
    $('.js-play-track').on('click', function() {
        buildSetlist();
        $('.js-wrapper').removeClass('game_ended');
        $('.js-settings').removeClass('visible');
        $('.js-wrapper').addClass('game_started');
        $('.js-score-wrapper').addClass('visible');
        playTrack();  
    });

    $('.js-replay-game').on('click', function() {
        // $('.js-word').text('').hide();
        // $('.js-not-enough').hide();
        resetGame();
        $('.js-wrapper').addClass('game_started');
        $('.js-score-wrapper').addClass('visible');
        playTrack();
    });

    $('.js-back-menu').on('click', function() {
        quitGame();
        // $('.js-buttons-wrapper').addClass('visible');
        $('.js-wrapper').removeClass('game_started');
        $('.js-settings').addClass('visible');
    });

    // Show settings
    // $('.js-show-settings').on('click', function() {
    //     $('.js-settings').addClass('visible');
    //     $('.js-buttons-wrapper').removeClass('visible');
    // });
    // Hide settings
    // $('.js-hide-settings').on('click', function() {
    //     $('.js-settings').removeClass('visible');
    //     $('.js-buttons-wrapper').addClass('visible');
    // });
    // Quit game
    $('.js-quit-game').on('click', function() {
        isPlaying = false;
        audioPlayer.pause();
        quitGame();
        $('.js-wrapper').removeClass('game_started');
        $('.js-settings').addClass('visible');
        // $('.js-buttons-wrapper').addClass('visible');
    });

    // Set amount of tracks by game
    $('.js-nb-tracks').on('keyup mouseup', function() {
        if(+$(this).val() < +$(this).attr('min'))
            $(this).val($(this).attr('min'));
        TRACKSBYGAME = +$(this).val();
        tracksByPlayer = Math.floor(TRACKSBYGAME / playersData.length);
    });

    // Set amount of options by game
    // $('.js-nb-options').on('keyup mouseup', function() {
    //     if(+$(this).val() < +$(this).attr('min'))
    //         $(this).val($(this).attr('min'));
    //     else if(+$(this).val() > playersAmount)
    //         $(this).val(playersAmount);
    //     ANSWERSAMOUNT = +$(this).val();
    //     POINTSBYANSWER = ANSWERSAMOUNT - DEFAULTANSWERSAMOUNT + 1;
    //     if(POINTSBYANSWER > playersAmount - DEFAULTANSWERSAMOUNT + 1)
    //         POINTSBYANSWER = playersAmount - DEFAULTANSWERSAMOUNT + 1;
    // });

    // Set difficulty level
    $('.js-input-difficulty').on('change', function() {
        var difficultyName = $(this).find('+ label').text();
        console.log(difficultyName);
        DIFFICULTYLEVEL = $(this).val();
        POINTSMULTIPLICATOR = DIFFICULTYLEVEL;
        $('.js-difficulty').text(difficultyName);
        $('.js-difficulty').attr('data-difficulty', DIFFICULTYLEVEL);
        $('.js-difficulty-details').removeClass('visible');
        $('.js-difficulty-details-' + DIFFICULTYLEVEL).addClass('visible');
        $('.js-multiplicator').text(POINTSMULTIPLICATOR);
        $('.js-multiplicator-wrapper').attr('data-value', POINTSMULTIPLICATOR);

        // Display infos
        DISPLAYTRACKSINFOS = DIFFICULTYLEVEL == 1;
        if(DISPLAYTRACKSINFOS) {
            $('.js-track-cover').removeClass('hidden');
        }
        else {
            $('.js-track-cover').addClass('hidden');
        }

        // Answers display
        DISPLAYAVATARS = DIFFICULTYLEVEL > 3;

        // Answers amount
        ANSWERSAMOUNT = DIFFICULTYLEVEL > 3 ? 8 : 4;
    });

    const playTrack = async () => {
        // Reset board        
        $('.js-answer').removeClass('correct');
        $('.js-answer').removeClass('incorrect');
        // Update track number
        playedTracks += 1;
        updateTrackNumber();
        // Track indexes
        /*var index0 = Math.floor(Math.random() * totalTracks);*/
        var currentData = setList.shift();
        var index0 = currentData[1];
        var index = index0 + 1;
        currentTrack = index0;
        index = index < 10 ? "00" + index : index < 100 ? "0" + index : index;
        // Like button
        setLikeButton(index0);
        // Track preview
        var trackPreview = "assets/previews/" + index + ".mp3";        
        jsAudioPlayer.attr('src', trackPreview);
        // Display track infos only if setting is set to true
        if(DISPLAYTRACKSINFOS) {
            // Track image
            var image = tracks.items[index0].track.album.images[1].url;
            $('.js-cover').attr('src', image);
            // Track name
            var name = tracks.items[index0].track.name;
            $('.js-name').text(name);
            // Track artists
            var artists = tracks.items[index0].track.artists;
            var artistsText = "";
            for(artist in artists) {
                artistsText += artists[artist].name + ", ";
            }
            artistsText = artistsText.slice(0, -2);
            $('.js-artist').text(artistsText);
        }
        else {
            // Track name
            $('.js-name').text('Morceau mystère');
            $('.js-artist').text('Artiste inconnu');
        }
        // Set first answer
        answers = [[currentData[0], true]];    
        // Shuffle players indexes    
        playerIndexes = shuffleArray(playerIndexes);
        // Set false answers
        var counter = 0;
        while(answers.length < ANSWERSAMOUNT && counter < playersAmount) {
            var currentName = playersData[playerIndexes[counter]][0];
            // Don't display other players that also chose current song to avoid confusion
            if(currentName != currentData[0] && !playersData[playerIndexes[counter]][1].includes (index0)) {
                answers.push([currentName, false]);
            }
            counter += 1;
        }
        // Shuffle answers
        answers = shuffleArray(answers);
        // Display answers
        $('.js-answers').empty();
        for(i=0; i<answers.length; i++) {
            var answerElem = '';
            if(DISPLAYAVATARS)
                answerElem = $('<li class="list_answers__item list_answers__item--avatar"><button class="list_answers__avatar js-answer" data-index="' + i + '"><img class="list_answers__img" src="assets/avatars/' + answers[i][0].toLowerCase() + '.png"/></button></li>');
            else
                answerElem = $('<li class="list_answers__item"><button class="list_answers__name js-answer" data-index="' + i + '">' + answers[i][0] + '</button></li>');
            $('.js-answers').append(answerElem);
        }
        // Countdown
        $('.js-countdown').text(DIFFICULTYLEVEL <= 2 ? DEFAULTTRACKDURATION : HARDCOREMODETRACKDURATION);
        // startCountdownBar();
        // Play track
        if(DIFFICULTYLEVEL > 2) {
            TRACKSTART = Math.floor(Math.random() * 24 - 0 + 1);
            audioPlayer.currentTime = TRACKSTART;
        }
        window.requestAnimationFrame(audioCountdown);
        audioPlayer.play();
        isPlaying = true;        
        $('.js-answers').addClass('playing');
    }

    $('body').on('click', '.js-answer', function() {
        var that = $(this);
        if(!isPlaying)
            return;
        isPlaying = false;
        audioPlayer.pause();
        $('.js-answers').removeClass('playing');
        var answerIndex = that.attr('data-index');
        var [name, result] = answers[answerIndex];
        // Countdown
        var currentDuration = DIFFICULTYLEVEL <= 2 ? DEFAULTTRACKDURATION : HARDCOREMODETRACKDURATION;
        var currentCoundtown = DIFFICULTYLEVEL <= 2 ? DEFAULTTRACKDURATION - audioPlayer.currentTime : TRACKSTART + HARDCOREMODETRACKDURATION - audioPlayer.currentTime;
        var countdownPercentage = currentCoundtown / currentDuration * 100;
        resetCountdownBar(countdownPercentage + '%', 0);
        if(result) {
            that.addClass('correct');
            playSound(soundRight);
            streak += 1;
            streakBonus = streak - MINSTREAK >= 0 ? streak - MINSTREAK + 1 : 0;
            var scoreIncrement = (POINTSBYANSWER + streakBonus) * POINTSMULTIPLICATOR;
            score += scoreIncrement;
            if(streakBonus > 0)
                $('.js-streak-wrapper').addClass('active');
            $('.js-streak').text(streakBonus > 0 ? streakBonus : '');
            updateScore(POINTSBYANSWER * POINTSMULTIPLICATOR);
        }
        else {
            if(PRODMODE)
                updateAssignedTracks(name, currentTrack);
            playSound(soundWrong);
            that.addClass('incorrect');
            resetStreak();
        }
        nextTrack();
    });

    // Like track
    $('.js-like-track').on('click', function() {
        var currentState = $(this).attr('data-liked') == 'true';
        if(!currentState)
            playerData.likedTracks.push(currentTrack);
        else
            playerData.likedTracks.splice(playerData.likedTracks.indexOf(currentTrack), 1);
        updateLikedTracks(playerData.likedTracks);
        $(this).attr('data-liked', !currentState);

    });

    jsAudioPlayer.on('timeupdate', function(event) {
        if((DIFFICULTYLEVEL > 2  && audioPlayer.currentTime >= TRACKSTART + HARDCOREMODETRACKDURATION)
         || DIFFICULTYLEVEL <= 2 && audioPlayer.currentTime >= audioPlayer.duration) {
            $('.js-countdown').text(0);
            isPlaying = false;
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
            $('.js-answers').removeClass('playing');
            playSound(soundWrong);            
            resetStreak();
            nextTrack();
        }
        else if(isPlaying) {
            // audioPlayer.volume = 0;
            audioPlayer.play();
        }
    });

    function audioCountdown() {
        var timer = DIFFICULTYLEVEL <= 2 ? DEFAULTTRACKDURATION - Math.floor(audioPlayer.currentTime) : TRACKSTART + HARDCOREMODETRACKDURATION - Math.floor(audioPlayer.currentTime);
        $('.js-countdown').text(timer);
        if(timer == 0)
            return;
        if(isPlaying) {
            var currentDuration = DIFFICULTYLEVEL <= 2 ? DEFAULTTRACKDURATION : HARDCOREMODETRACKDURATION;
            var currentCoundtown = DIFFICULTYLEVEL <= 2 ? DEFAULTTRACKDURATION - audioPlayer.currentTime : TRACKSTART + HARDCOREMODETRACKDURATION - audioPlayer.currentTime;
            var countdownPercentage = currentCoundtown / currentDuration * 100;
            $('.js-countdown-bar').css('width', countdownPercentage + '%');
            window.requestAnimationFrame(audioCountdown);
        }
    };

    $('.js-login-button').on('click', function() {
        login();
    });

    $('.js-username, .js-userkey').on('keyup', function(e) {
        if(e.which == 13) {
            login();
        }
    });

    $('.js-logout-button').on('click', function() {
        logout();
    });

    $('.js-display-leaderboard').on('click', function() {

        if($(this).hasClass('active')) {
            closeLeaderboard();
            return;
        }

        getAllScores().then(function(result) {
            var leaderboard = {}
            for(var difficulty in DIFFICULTYNAMES) {
                leaderboard[DIFFICULTYNAMES[difficulty]]= [];
            }
            for(var element in result) {
                var scores = result[element].scores;
                if(scores == null)
                    continue;
                var name = result[element].name;
                for(var score in scores) {
                    var [difficulty, tracks, points] = scores[score];
                    leaderboard[difficulty].push([name, tracks, points]);
                }
            }
            var counter = 0;
            for(var difficulty in DIFFICULTYNAMES) {
                counter += 1;
                var label = DIFFICULTYNAMES[difficulty];
                $('.js-leaderboard-content').append('<span class="leaderboard__title leaderboard__title--' + counter + ' panel_label">' + label + '</span>');
                leaderboard[label].sort((a,b) => (a[2] < b[2]) ? 1 : ((b[2] < a[2]) ? -1 : 0));
                var scoresList = $('<ul class="leaderboard__list"></ul>');
                scoresList.append($('<li class="leaderboard__item"><span class="leaderboard__value--head leaderboard__value--name">Joueur</span><span class="leaderboard__value--head leaderboard__value--tracks">Nombre de morceaux</span><span class="leaderboard__value--head leaderboard__value--points">Score</span></li>'));
                var i = 0;
                for(var score in leaderboard[label]) {
                    i +=1;
                    if(i > 20)
                        break;
                    var [name, tracks, points] = leaderboard[label][score];
                    var scoresItem = $('<li class="leaderboard__item"></li>')
                    scoresItem.append($('<span class="leaderboard__value leaderboard__value--name">' + name + '</span>'));
                    scoresItem.append($('<span class="leaderboard__value leaderboard__value--tracks">' + tracks + '</span>'));
                    scoresItem.append($('<span class="leaderboard__value leaderboard__value--points">' + points + '</span>'));
                    scoresList.append(scoresItem);
                }
                $('.js-leaderboard-content').append(scoresList);
            }
            openLeaderboard();
        });
    });

    $('.js-close-leaderboard').on('click', function() {
        closeLeaderboard();
    });

    function resetCountdownBar(value = '100%', transition = 0) {
        $('.js-countdown-bar').css('width', value);
        $('.js-countdown-bar').attr('data-timer', DIFFICULTYLEVEL <= 2 ? DEFAULTTRACKDURATION : HARDCOREMODETRACKDURATION);
    }

    function startCountdownBar() {
        // setTimeout(function() {
            // $('.js-countdown-bar').css('transition', 'all linear 1s');
            // $('.js-countdown-bar').css('width', '0%');
        // }, 1);
    }

    function login() {
        USERNAME = $('.js-username').val().toLowerCase();
        USERKEY = $('.js-userkey').val().toLowerCase();
        getPlayerData().then(function(result) {
            if(result.id != null) {
                playerData = result;
                window.localStorage.setItem("username", USERNAME);
                window.localStorage.setItem("userkey", USERKEY);
                $('.js-username').val('');
                $('.js-userkey').val('');
                $('.js-settings').addClass('visible');
                $('.js-bar-top').addClass('visible');
                $('.js-login').removeClass('visible');
            }
            else {
                alert('WRONG');
            }
        });
    }

    function logout() {
        USERNAME = '';
        USERKEY = ''; 
        window.localStorage.removeItem("username");
        window.localStorage.removeItem("userkey");
        closeLeaderboard();
        $('.js-settings').removeClass('visible');
        $('.js-bar-top').removeClass('visible');
        $('.js-login').addClass('visible');
    }

    function playSound(soundElem) {
        soundElem.currentTime = 0;
        soundElem.play();
    }

    function nextTrack() {
        setTimeout(function() {
            if(setList.length > 0) {
                resetCountdownBar();
                setTimeout(function() {
                    playTrack();
                }, 20);
            }
            else if($('.js-wrapper').hasClass('game_started'))
                endGame();
        }, 1000);
    }

    function setLikeButton(index) {
        $('.js-like-track').attr('data-liked', playerData.likedTracks.indexOf(index) >= 0);
    }

    function endGame() {
        // Update scores
        playerData.scores.push([DIFFICULTYNAMES[DIFFICULTYLEVEL-1], TRACKSBYGAME, score]);
        updateScores(playerData.scores);
        // End game
        $('.js-wrapper').removeClass('game_started');
        $('.js-wrapper').addClass('game_ended');
        $('.js-score-wrapper').removeClass('visible');
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    }

    function updateTrackNumber() {
        $('.js-track-number').text(playedTracks);
    }

    function updateScore(increment = 0) {
        $('.js-score').text(score);
        if(increment > 0) {
            $('.js-multiplicator').parent().append($('<span class="score_increment score_increment--base">+' + increment + '</span>'));
            if(streakBonus > 0)
                $('.js-streak-wrapper').append($('<span class="score_increment score_increment--streak">+' + (streakBonus * POINTSMULTIPLICATOR) + '</span>'));
            setTimeout(function() {
                $('.score_increment').addClass('animate');
            }, 10);
            setTimeout(function() {
                $('.score_increment').addClass('fade');
            }, 910);
            setTimeout(function() {
                $('.score_increment').remove();
            }, 1010);
        }
    }

    function resetStreak() {
        streak = 0;
        streakBonus = 0;
        $('.js-streak-wrapper').removeClass('active');
        $('.js-streak').text('');
    }

    function resetGame() {        
        quitGame();
        buildSetlist();
    }

    function quitGame() {        
        score = 0;
        updateScore();
        resetStreak();
        setList = [];
        setListLength = 0;
        tracksIndexes = [];
        playedTracks = 0;
        playersDataBuild = JSON.parse(JSON.stringify(playersData));
        $('.js-wrapper').removeClass('game_ended');
        $('.js-score-wrapper').removeClass('visible');
    }

    function openLeaderboard() {
        $('.js-settings').removeClass('visible');
        $('.js-leaderboard').addClass('visible');
        $('.js-close-leaderboard').addClass('visible');
        $('.js-logout-button').addClass('hidden');
        $('.js-display-leaderboard').addClass('active');
        $('#wrapper').removeClass('game_ended');
    }

    function closeLeaderboard() {
        $('.js-settings').addClass('visible');
        $('.js-leaderboard').removeClass('visible');
        $('.js-close-leaderboard').removeClass('visible');
        $('.js-display-leaderboard').removeClass('active');
        $('.js-logout-button').removeClass('hidden');
        $('.js-leaderboard-content').empty();
    }

    return {
        init() {
            updateScore();
            loadPlaylist();
        }
    }

})(UIController, APIController);

APPController.init();

// Database getters
async function getGameData() {
    const { data, error } = await _supabase
        .from('names')
        .select('name, tracks');
    var res = [];
    for(elem in data)
        res.push([data[elem].name, data[elem].tracks]);
    return res;
}

async function getPlayerData() {
    var { data, error } = await _supabase.rpc('get_profile', {current_user_name: USERNAME, current_user_key: USERKEY});
    if(data.likedTracks == null)
        data.likedTracks = [];
    return data;
}

async function updateLikedTracks(likedTracks) {
    const { error } = await _supabase
        .from("profiles")
        .update({ 'likedTracks': likedTracks })
        .eq('username', USERNAME)
        .eq('userkey', USERKEY);
    if(error != null)
        console.log(error);
}

async function getScores() {
    const { data, error } = await _supabase
        .from("scores")
        .select('scores')
        .eq('name', USERNAME);
    if(error != null)
        console.log(error);
    if(data == null)
        data = [];
    return data;
}

async function getAllScores() {
    const { data, error } = await _supabase
        .from("scores")
        .select('*');
    if(error != null)
        console.log(error);
    if(data == null)
        data = [];
    return data;
}

async function updateScores(scores) {
    const { error } = await _supabase
        .from("scores")
        .update({ 'scores': scores })
        .eq('name', USERNAME);
    if(error != null)
        console.log(error);
}

async function updateAssignedTracks(name, trackIndex) {
    const { data, error } = await _supabase
        .from("names")
        .select('assigned_tracks')
        .eq('name', name);
    if(error != null)
        console.log(error);
    var assignedTracks = data[0].assigned_tracks;
    if(assignedTracks == null)
        assignedTracks = {};
    var amount = 1;
    if(Object.hasOwn(assignedTracks, trackIndex))
        amount = +assignedTracks[trackIndex] + 1;
    assignedTracks[trackIndex] = amount;
    const { error2 } = await _supabase
        .from("names")
        .update({ 'assigned_tracks': assignedTracks })
        .eq('name', name);
    if(error != null)
        console.log(error2);
}