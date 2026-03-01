const express = require('express');
const cors = require('cors'); // <--- ESSENCIAL PARA CORRIGIR O ERRO
const axios = require('axios');
const admin = require('firebase-admin');

const app = express();

// Ativa a permissão para o seu site acessar o servidor
app.use(cors()); 
app.use(express.json());

// CONFIGURAÇÃO DO FIREBASE (Coloque suas credenciais aqui)
const serviceAccount = require("./sua-chave-firebase.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://trader-master-81f62-default-rtdb.firebaseio.com"
});

const db = admin.database();

// ROTA PARA CRIAR O PIX
app.post('/criar-pix', async (req, res) => {
  const { valor, email, uid } = req.body;

  try {
    const response = await axios.post('https://api.mercadopago.com/v1/payments', {
      transaction_amount: parseFloat(valor),
      description: `Deposito Trader Master - ${email}`,
      payment_method_id: 'pix',
      notification_url: "https://pagamentos-trader.onrender.com/webhook", // Seu link do Render
      payer: {
        email: email,
        first_name: 'Usuario',
        last_name: 'Master'
      }
    }, {
      headers: {
        'Authorization': `Bearer SEU_ACCESS_TOKEN_DO_MERCADO_PAGO`,
        'X-Idempotency-Key': Date.now().toString()
      }
    });

    const data = response.data;

    // Retorna para o seu index.html as informações do PIX
    res.json({
      qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64,
      copy_paste: data.point_of_interaction.transaction_data.qr_code
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao gerar PIX" });
  }
});

// WEBHOOK (Avisa o Firebase quando o aluno paga)
app.post('/webhook', async (req, res) => {
    const { data } = req.body;
    
    if (req.query.type === 'payment') {
        const paymentId = data.id;
        // Aqui você verifica se o pagamento foi aprovado no Mercado Pago
        // E atualiza o saldo no Firebase usando o UID que salvamos
        // db.ref('usuarios/' + uid).update({ saldo: novoSaldo });
    }
    res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor rodando e com CORS liberado!");
});
