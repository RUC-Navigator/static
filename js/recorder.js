// variables
var leftchannel = [];
var rightchannel = [];
var recorder = null;
var recording = false;
var recordingLength = 0;
var volume = null;
var audioInput = null;
var sampleRate = null;
var audioContext = null;
var context = null;
var outputElement = document.getElementById('output');
var outputString;

// feature detection
if (!navigator.getUserMedia)
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
                  navigator.mozGetUserMedia || navigator.msGetUserMedia;

if (navigator.getUserMedia){
    navigator.getUserMedia({audio:true}, success, function(e) {
    alert('Error capturing audio.');
    });
} else alert('getUserMedia not supported in this browser.');


function interleave(leftChannel, rightChannel){
  var length = leftChannel.length + rightChannel.length;
  var result = new Float32Array(length);

  var inputIndex = 0;

  for (var index = 0; index < length; ){
    result[index++] = leftChannel[inputIndex];
    result[index++] = rightChannel[inputIndex];
    inputIndex++;
  }
  return result;
}

function mergeBuffers(channelBuffer, recordingLength){
  var result = new Float32Array(recordingLength);
  var offset = 0;
  var lng = channelBuffer.length;
  for (var i = 0; i < lng; i++){
    var buffer = channelBuffer[i];
    result.set(buffer, offset);
    offset += buffer.length;
  }
  return result;
}

function writeUTFBytes(view, offset, string){
  var lng = string.length;
  for (var i = 0; i < lng; i++){
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function success(e){
    // creates the audio context
    audioContext = window.AudioContext || window.webkitAudioContext;
    context = new audioContext();

	// we query the context sample rate (varies depending on platforms)
    sampleRate = context.sampleRate;

    console.log('succcess');

    // creates a gain node
    volume = context.createGain();

    // creates an audio node from the microphone incoming stream
    audioInput = context.createMediaStreamSource(e);

    // connect the stream to the gain node
    audioInput.connect(volume);

    /* From the spec: This value controls how frequently the audioprocess event is
    dispatched and how many sample-frames need to be processed each call.
    Lower values for buffer size will result in a lower (better) latency.
    Higher values will be necessary to avoid audio breakup and glitches */
    var bufferSize = 2048;
    recorder = context.createScriptProcessor(bufferSize, 2, 2);

    recorder.onaudioprocess = function(e){
        if (!recording) return;
        var left = e.inputBuffer.getChannelData (0);
        var right = e.inputBuffer.getChannelData (1);
        // we clone the samples
        leftchannel.push (new Float32Array (left));
        rightchannel.push (new Float32Array (right));
        recordingLength += bufferSize;
        console.log('recording');
    }

    // we connect the recorder
    volume.connect (recorder);
    recorder.connect (context.destination);
}
