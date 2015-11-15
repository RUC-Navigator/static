for (var i=0; i<5; i++) {
	for (var j=0; j<2; j++) {
		rec("r" + i + j);
	}
}
function rec(id) {
	var $micro = $('#' + id);
	var microStr = $micro.text();
	var itv;
	$micro.on('mousedown', function () {
		startRecord();
		$micro.addClass('recording');
		itv = setInterval(function () {
			$micro.find('.speaker').toggleClass('status-1');
		}, 500);
	});
	$micro.on('mouseup', function () {
		stopRecord(id);
		$micro.removeClass('recording');
		clearInterval(itv);
	});
}

function startRecord() {
    // if micro is pressed, we start recording
    recording = true;
    // reset the buffers for the new recording
    leftchannel.length = rightchannel.length = 0;
    recordingLength = 0;
    outputElement.innerHTML = 'Recording now ...';
    // if S is pressed, we stop the recording and package the WAV file
}


function stopRecord(id) {
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
	
	var bu = document.getElementById("b" + id);
	var du = document.getElementById("d" + id);
	
	uploadAudio(blob, filename, id);
	
	bu.style.visibility='visible';
	du.style.visibility='visible';
	bu.onclick = function() {
		//new buzz.sound(window.location.href + 'uploads/' + filename).play();
		new buzz.sound(window.location.href.split('/src')[0] + '/uploads/case1/' + filename).play();
	};

	outputElement.innerHTML = 'Press to start speaking';
}


function uploadAudio(wavData, filename, tid){
	var reader = new FileReader();
	reader.onload = function(event){
		var fd = new FormData();
		var wavName = encodeURIComponent(filename);

		fd.append('fname', wavName);
		fd.append('txt', document.getElementById("st" + tid).innerHTML);
		fd.append('data', event.target.result);
		$.ajax({
			type: 'POST',
			url: '/src/1_postaudio',
			data: fd,
			processData: false,
			contentType: false,
            success: function (res) {
                if (res.status === 0) {
                    var id = res.id;
                    var itv = setInterval(function () {
                        $.get('/src/1_getresult?id=' + id, function (res) {
                            if (res.status === 0) {
                                clearInterval(itv);
								document.getElementById('d' + tid).disabled="";
							//	var str = res.txt;
								var words = res.txt.split('$');
								if (words[0]) {
									var para = "The error words you read : <table class=\"table table-striped\"><thead><tr>" +
											   "<th>#</th><th>Word</th><th>Find it in the dictionary</th></tr></thead><tbody>";
									var j = 0;
									for (var i in words) {
										j ++;
										para += "<tr><th scope=\"row\">" + j + "</th>" +
												"<td>" + words[i].split('@')[0] + "</td>" + 
												"<td><a href=\"" + words[i].split('@')[1] + "\" target=\"_blank\">" +
												"\"" + words[i].split('@')[0] + "\" in the dict</a></td></tr>";
									}
									para += "</tbody></table>";
									document.getElementById('p' + tid).innerHTML = para;
								} else {
									document.getElementById('p' + tid).innerHTML = "Congratulation! No error word."
								}
								$('#c' + tid).collapse('show');
                            }
                        });
                    }, 200);
                }
            },
            error: function () {
                console.log(arguments);
            }
		});
	};
	reader.readAsDataURL(wavData);
}