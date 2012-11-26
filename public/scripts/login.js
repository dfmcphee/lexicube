// on load of page
$(function(){
	// when the client clicks SEND
	$('#register .username').change( function() {
		$('#register .password-help').show();
	});
	
	$('#register .password').change( function() {
		if ($('#register .password').val() !== '') {
			$('#register .password-help').hide();
		}
	});
	
	$("#register").submit(function(e){
		if ($('#register .password-help').is(':hidden') && $('#register .password').val() === '') {
			$('#register .password-help').show();
			return false;
		}
    });
});