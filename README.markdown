MaskedInput Prototype
=============

A quick port of the jQuery Masked Input Plugin to Prototype.
The plugin breaks the native change event in the browser, the part where the jQuery.change() event is called in the original code is commented out. 
I don't know of anything similar in Prototype. 

Requires: Prototype >= 1.6.1
Tested on windows IE6, IE7, IE8, Opera 9.6, Chrome 3, FireFox 3, Safari 3

### Example code

  new MaskedInput('selector', '99.99.9999', {placeholder:'_', completed: function() { alert(this); }});
  
Selector can be any selector but the code will probably fail horribly on anything but input elements. 

Find the original jQuery code including supported masks at http://digitalbush.com/projects/masked-input-plugin/