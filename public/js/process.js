  $(document).ready(function() {
            $("#upload-form").submit(function(event) {
                event.preventDefault();
                var form_data = new FormData(this);
                // Wait info
                $(".infoku").html('<div class="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4" role="alert"><p>Please Wait...</p></div>');
                $.ajax({
                    type: "POST",
                    url: "/api/process/nobg",
                    data: form_data,
                    dataType: "json",
                    contentType: false,
                    cache: false,
                    processData: false,
                    success: function(result) {
                        if(result.error) {
                            $(".infoku").html('<div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert"><p>' + result.error + '</p></div>');
                        } else {
                            $("#result").html('<hr><div class="mb-4"><img src="' + result.image + '" alt="Processed Image" class="max-w-full"><br><a href="' + result.image + '" download><button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Download Image ( '+ result.size +' )</button></a></div><div class="mb-4"><button onClick="location.reload()" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Try another photos</button></div>');
// Success info
                            $(".infoku").html('<div class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4" role="alert"><p>Success, your image has been processed.</p></div>');
                        }
                    },
                    error: function() {
                        $(".infoku").html('<div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert"><p>Unknown Error, Please Try Again</p></div>');
                    }
                });
            });
        });
