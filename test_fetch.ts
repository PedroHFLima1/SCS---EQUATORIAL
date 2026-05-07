async function main() {
  const res = await fetch("http://localhost:3000/api/processes?module=travessia");
  const data = await res.json();
  const found = data.find((p: any) => p.protocol === "O RATO");
  console.log("Found:", !!found);
}
main();
