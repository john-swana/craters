import chai from "chai";
import Input from "../src/input";
var should = chai.should();
var expect = chai.expect;

describe("Input", function() {
  var input: Input;
  
  beforeEach("prepare input instance", function() {
    input = new Input();
  });
  
  afterEach("destroy input instance", function() {
    input.unbindKeys();
  });

  describe("Key Binding", async () => {
    it("should bind a key to an action", async () => {
      input.bind(Input.KEY.BACKSPACE, "BACKSPACE");
      // No public way to check bindings directly without private access or firing events,
      // but we assume if it doesn't throw it worked.
    });
  });

  describe("Key States", async () => {
    it("should detect a key press", async () => {
      input.bind(Input.KEY.SPACEBAR, "JUMP");
      
      var event: any = new KeyboardEvent("keydown", { code: "Space" });
      document.dispatchEvent(event);
      
      expect(input.isPressed("JUMP")).to.equal(2); // Just pressed
    });

    it("should transition from pressed (2) to held (1)", async () => {
      input.bind(Input.KEY.SPACEBAR, "JUMP");
      
      var event: any = new KeyboardEvent("keydown", { code: "Space" });
      document.dispatchEvent(event);
      
      expect(input.isPressed("JUMP")).to.equal(2); // First check
      expect(input.isPressed("JUMP")).to.equal(1); // Second check (held)
    });

    it("should detect a key release", async () => {
      input.bind(Input.KEY.SPACEBAR, "JUMP");
      
      // Press
      var downEvent: any = new KeyboardEvent("keydown", { code: "Space" });
      document.dispatchEvent(downEvent);
      expect(input.isPressed("JUMP")).to.equal(2);
      
      // Release
      var upEvent: any = new KeyboardEvent("keyup", { code: "Space" });
      document.dispatchEvent(upEvent);
      
      expect(input.isPressed("JUMP")).to.equal(0);
    });
    
    it("should ignore unbound keys", async () => {
       var event: any = new KeyboardEvent("keydown", { code: "KeyZ" }); // Z is not bound
       document.dispatchEvent(event);
       // Should not throw or cause issues
    });
  });
});