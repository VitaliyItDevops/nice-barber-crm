const fs = require("fs");
const dir = "C:/Users/BRYX/nice-barber-crm/sql";
for (let i = 1; i <= 4; i++) {
  const b64 = fs.readFileSync(`${dir}/chunk-${i}.b64`, "utf8");
  fs.writeFileSync(`${dir}/cdp-expr-${i}.txt`, `eval(atob("${b64}"))`);
}
const fb = fs.readFileSync(`${dir}/chunk-final.b64`, "utf8");
fs.writeFileSync(`${dir}/cdp-expr-final.txt`, `eval(atob("${fb}"))`);
console.log("ok");
