// var xmlhttp = ajaxReq();
// var url = "http://06d4-195-1-199-142.eu.ngrok.io/form?firstname=john&lastname=doe&email=oliver@oliver.com&title=Something&message=So+i+am+a+gay+man+yes+goood";
// var params = "your post body parameters";
// xmlhttp.open("POST", url, true); // set true for async, false for sync request
// xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
// xmlhttp.send(params); // or null, if no parameters are passed

// xmlhttp.onreadystatechange = function () {
//     if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
//        try {
//            var obj = JSON.parse(xmlhttp.responseText);

//            // do your work here

//        } catch (error) {
//            throw Error;
//        }
//     }
// }



function send() {
    var data = "firstname=" + document.getElementById("input1").value + "&lastname=" + document.getElementById("input2").value + "&email=" + document.getElementById("input3").value + "&title=" + document.getElementById("input4").value + "&message=" + document.getElementById("input5").value
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        console.log("nice")
      }
  };
  xhttp.open("POST", "http://3.16.42.132:3000/form?" + data, true);
  xhttp.send();
}