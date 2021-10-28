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
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          console.log("nice")
        }
    };
    xhttp.open("POST", "http://06d4-195-1-199-142.eu.ngrok.io/form?firstname=john&lastname=doe&email=oliver@oliver.com&title=Something&message=So+i+am+a+gay+man+yes+goood", true);
    xhttp.send();
}