// Generate de value on the scream
    const value1 = document.querySelector("#value1");
    const input1 = document.querySelector("#slice");
    const value2 = document.querySelector("#value2");
    const input2 = document.querySelector("#window_center");
    const value3 = document.querySelector("#value3");
    const input3 = document.querySelector("#window_width");
    value1.textContent = input1.value;
    value2.textContent = input2.value;
    value3.textContent = input3.value;
    
    input1.addEventListener("input", (event) => {
      value1.textContent = event.target.value;
    });
    input2.addEventListener("input", (event) => {
      value2.textContent = event.target.value;
    });
    input3.addEventListener("input", (event) => {
      value3.textContent = event.target.value;
    });