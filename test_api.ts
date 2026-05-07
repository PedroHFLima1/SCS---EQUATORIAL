async function main() {
  const res = await fetch("http://localhost:3000/api/protocol", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      inscricao: "test_ins",
      projeto: "test_proj",
      baseProcessId: "5a00dac2-11d1-4f4e-8366-3ce02ae75939",
      moduleName: "travessia",
      protocolo: "O RATO",
      concessionaria: "CCR",
      parceira: "APPLUS",
      status: "PROTOCOLADO",
      dataProtocolo: "2026-06-01",
      valor: "R$ 20",
      dataVencimento: "2026-07-01",
      tipo: "Novo",
      rodovia: "BR 101",
      km: "102",
      taxa: "SIM"
    })
  });
  console.log(await res.text());
}
main();
