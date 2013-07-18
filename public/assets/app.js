!function ($) {

  $(function(){

    var $window = $(window)

    // Disable certain links in docs
    $('section [href^=#]').click(function (e) {
      e.preventDefault()
    })

    // add-ons
    $('.add-on :checkbox').on('click', function () {
      var $this = $(this)
        , method = $this.attr('checked') ? 'addClass' : 'removeClass'
      $(this).parents('.add-on')[method]('active')
    })

    // tooltip demo
    $("a[data-toggle=tooltip]").tooltip();
    
    var edit_action = $('a.editaction')[0];
    if (edit_action) {
      $("#editbtn").prop("href", edit_action.href).toggle();
    }

  })

	$('textarea[data-toggle=autogrow]').autogrow();

}(window.jQuery)