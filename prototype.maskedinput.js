/*
    Masked Input plugin for prototype ported from jQuery 
    Bjarte K. Vebjørnsen <bjartekv at gmail dot com>
        
    Note that the onchange event isn't fired for masked inputs. It won't fire unless event.simulate.js is available.

    Requires: Prototype >= 1.6.1
    Optional: event.simulate.js from http://github.com/kangax/protolicious to trigger native change event.

    Tested on windows IE6, IE7, IE8, Opera 9.6, Chrome 3, FireFox 3, Safari 3
    
    Masked Input plugin for jQuery
    Copyright (c) 2007-2009 Josh Bush (digitalbush.com)
    Licensed under the MIT license (http://digitalbush.com/projects/masked-input-plugin/#license) 
    Version: 1.2.2 (03/09/2009 22:39:06)
*/

(function() {
    var pasteEventName = (Prototype.Browser.IE ? 'paste' : 'input'),
        iPhone = (window.orientation != undefined);    
            
    if(typeof(Prototype) == "undefined")
        throw "MaskedInput requires Prototype to be loaded.";
                        
    Element.addMethods({
        caret: function(element, begin, end) {
            if (element.length == 0) return;
            if (typeof begin == 'number') {
                end = (typeof end == 'number') ? end : begin;
                if (element.setSelectionRange) {
                    element.focus();
                    element.setSelectionRange(begin, end);
                } else if (element.createTextRange) {
                    var range = element.createTextRange();
                    range.collapse(true);
                    range.moveEnd('character', end);
                    range.moveStart('character', begin);
                    range.select();
                }
            } else {
                if (element.setSelectionRange) {
                    begin = element.selectionStart;
                    end = element.selectionEnd;
                } else if (document.selection && document.selection.createRange) {
                    var range = document.selection.createRange();
                    begin = 0 - range.duplicate().moveStart('character', -100000);
                    end = begin + range.text.length;
                }
                return { begin: begin, end: end };
            }
        }
    });

    MaskedInput = Class.create({
        initialize: function(selector, mask, settings) {  
            this.elements = $$(selector);
            this.mask(mask, settings);	 
        },
        unmask: function() { 
            this.elements.each(function(el) { 
                el.fire("mask:unmask"); 
            }); 
            return this; 
        },
        mask: function (mask, settings) {   
            if (!mask && this.elements.length > 0) {
                var input = $(this.elements[0]);
                var tests = input.retrieve("tests");
                return $A(input.retrieve("buffer")).map(function(c, i) {
                    return tests[i] ? c : null;
                }).join('');
            }
            settings = Object.extend({
                placeholder: "_",
                completed: null
            }, settings || {});	
            
            var defs = MaskedInput.definitions;
            var tests = [];
            var partialPosition = mask.length;
            var firstNonMaskPos = null;
            var len = mask.length;

            $A(mask.split("")).each(function(c, i) {
                if (c == '?') {
                    len--;
                    partialPosition = i;
                } else if (defs[c]) {
                    tests.push(new RegExp(defs[c]));
                    if(firstNonMaskPos==null)
                        firstNonMaskPos =  tests.length - 1;
                } else {
                    tests.push(null);
                }
            });
            
            this.elements.each(function(el) {
            
                var input = $(el);
                
                var buffer = $A(mask.replace(/\?/,'').split("")).map( function(c, i) { return defs[c] ? settings.placeholder : c });

                var ignore = false;  			//Variable for ignoring control keys
                var focusText = input.getValue();
                
                input.store("buffer", buffer).store("tests", tests);

                function seekNext(pos) {
                    while (++pos < len && !tests[pos]);
                    return pos;
                };

                function shiftL(pos) {
                    while (!tests[pos] && --pos >= 0);
                    for (var i = pos; i < len; i++) {
                        if (tests[i]) {
                            buffer[i] = settings.placeholder;
                            var j = seekNext(i);
                            if (j < len && tests[i].test(buffer[j])) {
                                buffer[i] = buffer[j];
                            } else
                                break;
                        }
                    }
                    writeBuffer();
                    input.caret(Math.max(firstNonMaskPos, pos));
                };

                function shiftR(pos) {
                    for (var i = pos, c = settings.placeholder; i < len; i++) {
                        if (tests[i]) {
                            var j = seekNext(i);
                            var t = buffer[i];
                            buffer[i] = c;
                            if (j < len && tests[j].test(t))
                                c = t;
                            else
                                break;
                        }
                    }
                };

                function keydownEvent(e) {
                    var pos = input.caret();
                    var k = e.keyCode;
                    ignore = (k < 16 || (k > 16 && k < 32) || (k > 32 && k < 41));
                    //delete selection before proceeding
                    if ((pos.begin - pos.end) != 0 && (!ignore || k == 8 || k == 46))
                        clearBuffer(pos.begin, pos.end);

                    //backspace, delete, and escape get special treatment
                    if (k == 8 || k == 46 || (iPhone && k == 127)) {//backspace/delete
                        shiftL(pos.begin + (k == 46 ? 0 : -1));
                        e.stop();
                    } else if (k == 27) {//escape
                        input.setValue(focusText);
                        input.caret(0, checkVal());
                        e.stop();
                    }
                };

                function keypressEvent(e) {
                    if (ignore) {
                        ignore = false;
                        //Fixes Mac FF bug on backspace
                        return (e.keyCode == 8) ? false : null;
                    }
                    e = e || window.event;
                    var k = e.charCode || e.keyCode || e.which;
                    var pos = input.caret();
                    if (e.ctrlKey || e.altKey || e.metaKey) {//Ignore
                        return true;
                    } else if ((k >= 32 && k <= 125) || k > 186) {//typeable characters
                        var p = seekNext(pos.begin - 1);
                        if (p < len) {
                            var c = String.fromCharCode(k);
                            if (tests[p].test(c)) {
                                shiftR(p);
                                buffer[p] = c;
                                writeBuffer();
                                var next = seekNext(p);
                                input.caret(next);
                                if (settings.completed && next == len)
                                    settings.completed.call(input);
                            }
                        }
                    }
                    e.stop();
                };
            
                function blurEvent(e) {
                    checkVal();
                    if (input.getValue() != focusText) {
                        // since the native change event doesn't fire we have to fire it ourselves
                        // since Event.fire doesn't support native events we're using Event.simulate if available
                        if (window.Event.simulate) {
                            input.simulate('change');
                        }
                    }
                };
            
                function focusEvent(e) {
                    focusText = input.getValue();
                    var pos = checkVal();
                    writeBuffer();
                        
                    setTimeout(function() {
                        if (pos == mask.length)
                            input.caret(0, pos);
                        else
                            input.caret(pos);
                    }, 0);
                };
            
                function pasteEvent(e) {
                    setTimeout(function() { input.caret(checkVal(true)); }, 0);
                }; 

                function clearBuffer(start, end) {
                    for (var i = start; i < end && i < len; i++) {
                        if (tests[i])
                            buffer[i] = settings.placeholder;
                    }
                    
                };

                function writeBuffer() { return input.setValue(buffer.join('')).getValue(); };

                function checkVal(allow) {
                    //try to place characters where they belong
                    var test = input.getValue();
                    var lastMatch = -1;
                    for (var i = 0, pos = 0; i < len; i++) {
                        if (tests[i]) {
                            buffer[i] = settings.placeholder;
                            while (pos++ < test.length) {
                                var c = test.charAt(pos - 1);
                                if (tests[i].test(c)) {
                                    buffer[i] = c;
                                    lastMatch = i;
                                    break;
                                }
                            }
                            if (pos > test.length)
                                break;
                        } else if (buffer[i] == test[pos] && i!=partialPosition) {
                            pos++;
                            lastMatch = i;
                        } 
                    }
                    
                    if (!allow && lastMatch + 1 < partialPosition) {
                        input.setValue("");
                        clearBuffer(0, len);
                    } else if (allow || lastMatch + 1 >= partialPosition) {
                        writeBuffer();
                        if (!allow) input.setValue(input.getValue().substring(0, lastMatch + 1));
                    }
                    
                    return (partialPosition ? i : firstNonMaskPos);
                };
		
                if (!input.readAttribute("readonly"))
                    input
                    .observe("mask:unmask", function() {
                        input
                            .store("buffer",undefined)
                            .store("tests",undefined)
                            .stopObserving("mask:unmask")
                            .stopObserving("focus", focusEvent)
                            .stopObserving("blur", blurEvent)
                            .stopObserving("keydown", keydownEvent)
                            .stopObserving("keypress", keypressEvent)
                            .stopObserving(pasteEventName, pasteEvent);
                    })
                    .observe("focus", focusEvent)
                    .observe("blur", blurEvent)
                    .observe("keydown", keydownEvent)
                    .observe("keypress", keypressEvent)
                    .observe(pasteEventName, pasteEvent);

                checkVal(); //Perform initial check for existing values
            });
            return this;
        }
    });

    Object.extend(MaskedInput,{    
        definitions: {
            '9': "[0-9]",
            'a': "[A-Za-z]",
            '*': "[A-Za-z0-9]"
        }
    });
})();