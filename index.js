const express = require('express');
const mercadopago = require('mercadopago');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// Seu Access Token do Mercado Pago
mercadopago.configurations.setAccessToken("APP_USR-7479697238733634-030102-44c336d210a04cb97d3fef3d5b4cf647-3234523393");

app.post('/criar-pix', async (req, res) => {
    const { valor, email, uid } = req.body;
    
    const payment_data = {
        transaction_amount: Number(valor),
        description: 'Deposito Trader Master',
        payment_method_id: 'pix',
        payer: {
            email: email,
            first_name: 'Cliente',
            last_name: 'Trader Master'
        },
        external_reference: uid // Importante para identificar quem pagou no Firebase depois
    };

    try {
        const response = await mercadopago.payment.create(payment_data);
        res.json({
            copy_paste: response.body.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: response.body.point_of_interaction.transaction_data.qr_code_base64
        });
    } catch (error) {
        console.error("Erro no Mercado Pago:", error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para testar se o servidor está online
app.get('/', (req, res) => {
    res.send('Servidor Trader Master Online!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
