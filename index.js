const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');

const app = express();

// Libera o acesso para o seu site (index.html) não dar erro de conexão
app.use(cors());
app.use(express.json());

// CONFIGURAÇÃO DO FIREBASE
// Certifique-se de que o arquivo sua-chave-firebase.json esteja na mesma pasta no seu servidor
const serviceAccount = require("./sua-chave-firebase.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://trader-master-81f62-default-rtdb.firebaseio.com"
});

const db = admin.database();

// SEU TOKEN DO MERCADO PAGO (INSERIDO)
const MP_ACCESS_TOKEN = "APP_USR-7479697238733634-030102-44c336d210a04cb97d3fef3d5b4cf647-3234523393";

// ROTA PARA CRIAR O PIX
app.post('/criar-pix', async (req, res) => {
  const { valor, email, uid } = req.body;

  try {
    const response = await axios.post('https://api.mercadopago.com/v1/payments', {
      transaction_amount: parseFloat(valor),
      description: `Deposito Trader Master`,
      payment_method_id: 'pix',
      // Metadata é o que permite ao Webhook saber quem pagou
      metadata: { 
        user_uid: uid,
        user_email: email 
      },
      notification_url: "https://pagamentos-trader.onrender.com/webhook",
      payer: {
        email: email,
        first_name: 'Usuario',
        last_name: 'Master'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'X-Idempotency-Key': Date.now().toString()
      }
    });

    const data = response.data;

    res.json({
      qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64,
      copy_paste: data.point_of_interaction.transaction_data.qr_code
    });

  } catch (error) {
    console.error("Erro MP:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Erro ao gerar PIX" });
  }
});

// WEBHOOK - ATUALIZA O SALDO AUTOMATICAMENTE NO FIREBASE
app.post('/webhook', async (req, res) => {
  const { data, type } = req.body;

  // Verifica se a notificação é de um pagamento
  if (type === 'payment' || req.query.topic === 'payment') {
    const paymentId = data ? data.id : req.query.id;

    try {
      // Consulta o Mercado Pago para ver se o status está "approved"
      const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
      });

      const paymentData = response.data;

      if (paymentData.status === 'approved') {
        const uid = paymentData.metadata.user_uid;
        const valorPago = paymentData.transaction_amount;

        // Acessa o Firebase para atualizar o saldo
        const userRef = db.ref(`usuarios/${uid}`);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();

        if (userData) {
          const saldoAtual = parseFloat(userData.saldo || 0);
          const novoSaldo = saldoAtual + parseFloat(valorPago);

          // Salva o novo saldo somado
          await userRef.update({ saldo: novoSaldo });
          console.log(`PAGAMENTO APROVADO: R$${valorPago} adicionados ao UID: ${uid}`);
        }
      }
    } catch (error) {
      console.error("Erro ao processar Webhook:", error.message);
    }
  }

  // Envia status 200 para o Mercado Pago saber que recebemos a aviso
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Trader Master Online na porta ${PORT}`);
});
