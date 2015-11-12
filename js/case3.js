function startRecord() {
    // if micro is pressed, we start recording
    recording = true;
    // reset the buffers for the new recording
    leftchannel.length = rightchannel.length = 0;
    recordingLength = 0;
    outputElement.innerHTML = 'Recording now ...';
    // if S is pressed, we stop the recording and package the WAV file
}


function stopRecord() {
    // we stop recording
    recording = false;

    outputElement.innerHTML = 'Uploadinging wav file ...';
	
    // we flat the left and right channels down
    var leftBuffer = mergeBuffers ( leftchannel, recordingLength );
    var rightBuffer = mergeBuffers ( rightchannel, recordingLength );
    // we interleave both channels together
    var interleaved = interleave ( leftBuffer, rightBuffer );

    // we create our wav file
    var buffer = new ArrayBuffer(44 + interleaved.length * 2);
    var view = new DataView(buffer);

    // RIFF chunk descriptor
    writeUTFBytes(view, 0, 'RIFF');
    view.setUint32(4, 44 + interleaved.length * 2, true);
    writeUTFBytes(view, 8, 'WAVE');
    // FMT sub-chunk
    writeUTFBytes(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    // stereo (2 channels)
    view.setUint16(22, 2, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    // data sub-chunk
    writeUTFBytes(view, 36, 'data');
    view.setUint32(40, interleaved.length * 2, true);

    // write the PCM samples
    var lng = interleaved.length;
    var index = 44;
    var volume = 1;
    for (var i = 0; i < lng; i++){
        view.setInt16(index, interleaved[i] * (0x7FFF * volume), true);
        index += 2;
    }

    // our final binary blob
    var blob = new Blob ( [ view ], { type : 'audio/wav' } );


    var filename = 'audio_recording_' + new Date().getTime() + '.wav';

	

    // let's save it locally
    // outputElement.innerHTML = 'Handing off the file now...';
    var url = (window.URL || window.webkitURL).createObjectURL(blob);


	var li = document.createElement('li');
	//var au = document.createElement('a');
	var bu = document.createElement('button');
	//var hf = document.createElement('a');

    uploadAudio(blob, filename, $(li));

	//au.controls = true;
	//au.src = url;
	bu.className= "btn btn-warning playSound";
	bu.innerHTML ="playSound";
	bu.onclick = function() {
		//new buzz.sound(window.location.href + 'uploads/' + filename).play();
		new buzz.sound('../uploads/' + filename).play();
	};
	var soundID = filename;
	//hf.href = url;
	//hf.download = filename;
	//hf.innerHTML = "download wav file";
	li.appendChild(bu);
	//li.appendChild(hf);
	recordingslist.appendChild(li);
    $(li).addClass('li-send pull-left');
	li.scrollIntoView();
	
	outputElement.innerHTML = 'Press to start speaking';
}


function uploadAudio(wavData, filename, $li){
	var reader = new FileReader();
	reader.onload = function(event){
		var fd = new FormData();
		var wavName = encodeURIComponent(filename);

		fd.append('fname', wavName);
		fd.append('data', event.target.result);
		$.ajax({
			type: 'POST',
			url: '/src/3_postaudio',
			data: fd,
			processData: false,
			contentType: false,
            success: function (res) {
                if (res.status === 0) {
                    var id = res.id;
                    var itv = setInterval(function () {
                        $.get('/src/3_getresult?id=' + id, function (res) {
                            if (res.status === 0) {
                                clearInterval(itv);
								$('<span> ' + res.pre.split('$')[2] + '</span>').appendTo($li);
                                var $newli = $('<li class="li-reply pull-right"></li>');
                                $newli.insertAfter($li);
                                //var audio = document.createElement("audio");
                                //audio.src = res.path;
                                //$(audio).appendTo($newli);
                                //$('<a href="' + res.path + '" target="_blank">下载文件</a>').appendTo($newli);
								//new buzz.sound(window.location.href + res.path).play();
								$('<button class="btn btn-warning playSound" onclick="new buzz.sound(\'../' + res.path + '\').play();">Reply</button>').appendTo($newli);
                                $('<span></span>').addClass('txt').text(res.txt).appendTo($newli);
                            }
                        });
                    }, 1000);
                }
            },
            error: function () {
                console.log(arguments);
            }
		});
	};
	reader.readAsDataURL(wavData);
}