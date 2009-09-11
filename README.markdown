MaskedInput Prototype
=============

A quick port of the jQuery Masked Input Plugin to Prototype.
The plugin breaks the native change event in the browser, the part where the jQuery.change() event is called in the original code is commented out. 
I don't know of anything similar in Prototype. 

Requires: Prototype >= 1.6.1
Tested on windows IE6, IE7, IE8, Opera 9.6, Chrome 3, FireFox 3, Safari 3

### Example code

  new MaskedInput('input', '99.99.9999');
  
  <input id="test" type="text" size="10" />
  <input id="test2" type="text" size="10" />
  
Internally the $$() operator is used so you can use the same mask for multiple elements or single elements.

   new MaskedInput('#test', '99.99.9999'); 

Placeholder character can be changed and an event can be called when the mask is completed
    
   function finished() { alert(this); } 
   
   new MaskedInput('#test', '99.99.9999', {placeholder:'+', completed: finished}); 
   
If you need to unmask an element, use the unmask function 
   
   var mi = new MaskedInput('#test', '99.99.9999'); 
   mi.unmask().mask('99.99.9999');
   
The mask definitions can be changed (only uppercase allowed)

  MaskedInput.definitions['a'] = '[A-Z]'; 
  
Or new ones can be added (only 0 and 1 allowed)
  
  MaskedInput.definitions['b'] = '[0-1]' 
  
  new MaskedInput('#test', 'aaa.bb.9999');   
  
Sorry about the useless example.
   
Find the original jQuery code including supported masks at http://digitalbush.com/projects/masked-input-plugin/