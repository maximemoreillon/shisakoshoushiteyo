const PERIOD = 10


// Related to sound
var migi_yosh_sound = new Audio('sounds/migiyosh.mp3');
var hidari_yosh_sound = new Audio('sounds/hidariyosh.mp3');
var shisakoshoushiteyo_sound = new Audio('sounds/shisakoshoushiteyo.mp3');

var migi_yosh_counter = 0;
var hidari_yosh_counter = 0;
var shisakoshoushiteyo_counter = 0;

var migi_yosh_played = false;
var hidari_yosh_played = false;
var shisakoshoushiteyo_played = false;

function access_camera(){
  var video = document.getElementById("input");



  if (navigator.mediaDevices.getUserMedia) {
    console.log("Accessing camera...");
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(function (stream) {
        video.srcObject = stream;

        // Wait for metadata to be loaded
        video.addEventListener( "loadedmetadata", function (e) {
          console.log("Camera access OK");

          // Needed for posenet to work
          this.width = this.videoWidth
          this.height = this.videoHeight

          resize_canvas();

          load_model();

        }, false );

      })
      .catch(function (error) {
        console.log("Camera access ERROR");
      });
  }
}



function load_model(){

  console.log("Loading model...");

  const options = {
    architecture: 'MobileNetV1',
    outputStride: 16,
    inputResolution: 513,
    multiplier: 0.75
  };

  posenet.load().then(net => {
    console.log("Model loaded");
    detect_poses(net);
  });
}


function detect_poses(net){

  const input = document.getElementById('input');

  const options= {
    flipHorizontal: false,
    maxDetections: 5,
    scoreThreshold: 0.9,
    nmsRadius: 20
  }

  net.estimateMultiplePoses(input,options).then(poses => {

    // Draw video
    const input = document.getElementById("input");
    const output = document.getElementById("output");
    const ctx = output.getContext("2d");

    ctx.drawImage(input, 0, 0, output.width, output.height);

    //poses.forEach(draw_pose);

    check_yosh(poses);



    // repeat after some pause
    setTimeout(function(){ detect_poses(net) }, PERIOD);
  });

}

function draw_pose(pose){


  const input = document.getElementById("input");
  const output = document.getElementById("output");
  const ctx = output.getContext("2d");

  var scale = {
    x: output.width / input.videoWidth,
    y: output.height / input.videoHeight
  };

  // draw points
  /*
  pose.keypoints.forEach(keypoint => {

    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(
      keypoint.position.x * scale.x,
      keypoint.position.y * scale.y,
      2, 0, 2 * Math.PI);
    ctx.fill();
  })
  */

  ctx.strokeStyle = "cyan";
  ctx.lineWidth = 2;
  connect_two_keypoints(pose, 5, 6) // Shoulder to shoulder
  connect_two_keypoints(pose, 5, 7) // Left shoulder to left elbow
  connect_two_keypoints(pose, 6, 8)
  connect_two_keypoints(pose, 7, 9) // Left elbow to left wrist
  connect_two_keypoints(pose, 8, 10)
  connect_two_keypoints(pose, 11, 12) // Hip to hip
  connect_two_keypoints(pose, 5, 11) // Left shoulder to left hip
  connect_two_keypoints(pose, 6, 12) // right shoulder to right hip
}

function connect_two_keypoints(pose, kp1, kp2){

  const input = document.getElementById("input");
  const output = document.getElementById("output");
  const ctx = output.getContext("2d");

  var scale = {
    x: output.width / input.videoWidth,
    y: output.height / input.videoHeight
  };


  ctx.beginPath();
  ctx.moveTo(pose.keypoints[kp1].position.x * scale.x, pose.keypoints[kp1].position.y * scale.y);
  ctx.lineTo(pose.keypoints[kp2].position.x * scale.x, pose.keypoints[kp2].position.y * scale.y);
  ctx.stroke();
}

function check_yosh(poses){

  const input = document.getElementById("input");
  const output = document.getElementById("output");
  const ctx = output.getContext("2d");

  var scale = {
    x: output.width / input.videoWidth,
    y: output.height / input.videoHeight
  };

  var threshold_ratio = 0.3
  var migi_yoshed = false;
  var hidari_yoshed = false;
  var not_yoshed = false;

  poses.forEach(pose =>{
    // get a reference length (right shoulder to right hip)
    var ref_start = pose.keypoints[12].position.y;
    var ref_end = pose.keypoints[6].position.y;
    var reference_length = Math.abs(ref_end-ref_start);

    // only perform detection if close enough
    if(reference_length > 0.2*input.videoHeight){

      const left_elbow = pose.keypoints[7].position.x;
      const right_elbow = pose.keypoints[8].position.x;
      const left_wrist = pose.keypoints[9].position.x;
      const right_wrist = pose.keypoints[10].position.x;

      var left_wrist_to_elbow = left_wrist-left_elbow;
      var right_wrist_to_elbow = right_wrist-right_elbow;

      draw_yosh_areas(ctx, pose, reference_length, threshold_ratio, scale);

      ctx.font = String(0.4*reference_length) + "px Verdana";
      ctx.textAlign = "center";

      if(Math.abs(left_wrist_to_elbow) > threshold_ratio*reference_length || Math.abs(right_wrist_to_elbow) > threshold_ratio*reference_length){
        if(Math.abs(left_wrist_to_elbow) > threshold_ratio*reference_length){
          if(left_wrist_to_elbow > 0){
            ctx.fillStyle = "#00cc00";
            ctx.fillText("左よし!", pose.keypoints[9].position.x * scale.x, (pose.keypoints[9].position.y-(0.2*reference_length)) * scale.y);
            hidari_yoshed = true;
          }
          else {
            ctx.fillStyle = "#5555FF";
            ctx.fillText("右よし!", pose.keypoints[9].position.x * scale.x, (pose.keypoints[9].position.y-(0.2*reference_length)) * scale.y);
            migi_yoshed = true;
          }
        }
        if(Math.abs(right_wrist_to_elbow) > threshold_ratio*reference_length){
          if(right_wrist_to_elbow > 0){
            ctx.fillStyle = "#00cc00";
            ctx.fillText("左よし!", pose.keypoints[10].position.x * scale.x, (pose.keypoints[10].position.y-(0.2*reference_length)) * scale.y);
            hidari_yoshed = true;
          }
          else {
            ctx.fillStyle = "#5555FF";
            ctx.fillText("右よし!", pose.keypoints[10].position.x * scale.x, (pose.keypoints[10].position.y-(0.2*reference_length)) * scale.y);
            migi_yoshed = true;
          }
        }
      }
      else {
        ctx.fillStyle = "red";
        ctx.fillText("指差呼称してよ！", pose.keypoints[0].position.x * scale.x, (pose.keypoints[0].position.y-(0.4*reference_length)) * scale.y);
        not_yoshed = true;
      }
    }
  });

  // Sounds
  // RIGHT
  if(migi_yoshed && migi_yosh_counter< 100) migi_yosh_counter += 20;
  if(!migi_yoshed && migi_yosh_counter > 0) migi_yosh_counter -= 20;
  if(migi_yosh_counter >= 100 && !migi_yosh_played){
    migi_yosh_sound.play();
    migi_yosh_played = true;
  }
  if(migi_yosh_counter < 10 && migi_yosh_played) migi_yosh_played = false;

  // LEFT

  if(hidari_yoshed && hidari_yosh_counter< 100) hidari_yosh_counter += 20;
  if(!hidari_yoshed && hidari_yosh_counter > 0) hidari_yosh_counter -= 20;
  if(hidari_yosh_counter >= 100 && !hidari_yosh_played){
    hidari_yosh_sound.play();
    hidari_yosh_played = true;
  }
  if(hidari_yosh_counter < 10 && hidari_yosh_played) hidari_yosh_played = false;

  // SHISAKOSHOUSHITE
  if(not_yoshed && shisakoshoushiteyo_counter< 100) shisakoshoushiteyo_counter += 2;
  if(!not_yoshed && shisakoshoushiteyo_counter > 0) shisakoshoushiteyo_counter -= 10;
  if(shisakoshoushiteyo_counter >= 100 && !shisakoshoushiteyo_played){
    shisakoshoushiteyo_sound.play();
    shisakoshoushiteyo_played = true;
  }
  if(shisakoshoushiteyo_counter < 10 && shisakoshoushiteyo_played) shisakoshoushiteyo_played = false;


}

function draw_yosh_areas(ctx, pose, reference_length, threshold_ratio, scale){
  // Draw yosh areas
  ctx.strokeStyle = "cyan";

  ctx.lineWidth = 0.01 * reference_length;
  ctx.save();
  ctx.setLineDash([5, 3]);

  var left_elbow = { x: pose.keypoints[7].position.x, y: pose.keypoints[7].position.y}
  var right_elbow = { x: pose.keypoints[8].position.x, y: pose.keypoints[8].position.y}
  var left_wrist = {x: pose.keypoints[9].position.x, y: pose.keypoints[9].position.y}
  var right_wrist = {x: pose.keypoints[10].position.x, y: pose.keypoints[10].position.y}

  // left of left
  ctx.beginPath();
  ctx.moveTo(
    (left_elbow.x + threshold_ratio*reference_length) * scale.x,
    (left_wrist.y - 0.2 *reference_length) * scale.y
  );
  ctx.lineTo(
    (left_elbow.x + threshold_ratio*reference_length) * scale.x,
    (left_wrist.y + 0.2 *reference_length) * scale.y
  );
  // right of left
  ctx.moveTo(
    (left_elbow.x - threshold_ratio*reference_length) * scale.x,
    (left_wrist.y - 0.2 *reference_length) * scale.y
  );
  ctx.lineTo(
    (left_elbow.x - threshold_ratio*reference_length) * scale.x,
    (left_wrist.y + 0.2 *reference_length) * scale.y
  );
  // Horizontal line
  ctx.moveTo(
    (left_elbow.x - threshold_ratio*reference_length) * scale.x,
    (left_wrist.y) * scale.y
  );
  ctx.lineTo(
    (left_elbow.x + threshold_ratio*reference_length) * scale.x,
    (left_wrist.y) * scale.y
  );

  // vertical from left elbow
  ctx.moveTo(
    (left_elbow.x) * scale.x,
    (left_elbow.y) * scale.y
  );
  ctx.lineTo(
    (left_elbow.x) * scale.x,
    (left_wrist.y) * scale.y
  );

  // left of right
  ctx.moveTo(
    (right_elbow.x + threshold_ratio*reference_length) * scale.x,
    (right_wrist.y - 0.2 *reference_length) * scale.y
  );
  ctx.lineTo(
    (right_elbow.x + threshold_ratio*reference_length) * scale.x,
    (right_wrist.y + 0.2 *reference_length) * scale.y
  );
  // right of right
  ctx.moveTo(
    (right_elbow.x - threshold_ratio*reference_length) * scale.x,
    (right_wrist.y - 0.2 *reference_length) * scale.y
  );
  ctx.lineTo(
    (right_elbow.x - threshold_ratio*reference_length) * scale.x,
    (right_wrist.y + 0.2 *reference_length) * scale.y
  );
  // Horizontal line
  ctx.moveTo(
    (right_elbow.x - threshold_ratio*reference_length) * scale.x,
    (right_wrist.y) * scale.y
  );
  ctx.lineTo(
    (right_elbow.x + threshold_ratio*reference_length) * scale.x,
    (right_wrist.y) * scale.y
  );

  // vertical from right elbow
  ctx.moveTo(
    (right_elbow.x) * scale.x,
    (right_elbow.y) * scale.y
  );
  ctx.lineTo(
    (right_elbow.x) * scale.x,
    (right_wrist.y) * scale.y
  );

  ctx.stroke();
  ctx.restore(); // remove dashed lines

  // Points for limbs
  var point_radius = 0.04 * reference_length;
  ctx.save();
  ctx.fillStyle = "cyan";
  ctx.beginPath();
  ctx.arc(right_elbow.x * scale.x, right_elbow.y * scale.y, point_radius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(left_elbow.x * scale.x, left_elbow.y * scale.y, point_radius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(right_wrist.x * scale.x, right_wrist.y * scale.y, point_radius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(left_wrist.x * scale.x, left_wrist.y * scale.y, point_radius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(right_elbow.x * scale.x, right_wrist.y * scale.y, point_radius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(left_elbow.x * scale.x, left_wrist.y * scale.y, point_radius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore(); // remove dashed lines

  // Progress indicator right
  ctx.lineWidth = 0.02 * reference_length;
  ctx.beginPath();
  ctx.moveTo(
    (right_elbow.x) * scale.x,
    (right_wrist.y) * scale.y
  );
  ctx.lineTo(
    (right_wrist.x) * scale.x,
    (right_wrist.y) * scale.y
  );
  // Progress indicator left
  ctx.moveTo(
    (left_elbow.x) * scale.x,
    (left_wrist.y) * scale.y
  );
  ctx.lineTo(
    (left_wrist.x) * scale.x,
    (left_wrist.y) * scale.y
  );
  ctx.stroke();


}

function resize_canvas(){
  const input = document.getElementById("input");
  const output = document.getElementById("output");

  var video_aspect_ratio = input.videoWidth / input.videoHeight;

  //output.width = input.videoWidth;
  //output.height = input.videoHeight;

  output.width = output.parentNode.offsetWidth;
  output.height = output.parentNode.offsetHeight;

}

window.onresize = function(event) {
  resize_canvas();
};

function start(){
  access_camera();
}

// Run
start();
