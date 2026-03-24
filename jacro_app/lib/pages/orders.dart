import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class Orders extends StatefulWidget {
  const Orders({super.key});

  @override
  State<Orders> createState() => _OrdersState();
}

class _OrdersState extends State<Orders> {
  List orders = [];

  Future<void> fetchOrders() async {
    final res = await http.get(
      Uri.parse("https://mastercoder30.pythonanywhere.com/get_orders"),
    );
    if (res.statusCode == 200) {
      setState(() {
        final data = json.decode(res.body);
        orders = List.from(data.reversed);
      });
    }
  }

  @override
  void initState() {
    super.initState();
    fetchOrders();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Orders List")),
      body: ListView.builder(
        itemCount: orders.length,
        itemBuilder: (ctx, i) {
          final o = orders[i];
          return Card(
            child: ListTile(
              title: Text("Customer: ${o['first_name']}"),
              subtitle: Text("Order ID: ${o['id']}"),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (ctx) => OrderDetails(order: o)),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class OrderDetails extends StatelessWidget {
  final Map order;
  const OrderDetails({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Order Details")),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Order ID: ${order['id']}",
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 8),
            Text(
              "Customer: ${order['first_name']} ${order['last_name']}",
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 8),
            Text(
              "Product Name: ${order['product_name']}",
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              "Price: ${order['price']}",
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              "Address: ${order['address']}",
              style: const TextStyle(fontSize: 14),
            ),
            Text("Country: ${order['country']}"),
            Text("Pincode: ${order['pincode']}"),
            Text("Phone: ${order['phone_number']}"),
            const SizedBox(height: 20),
            if (order['customer_image_url'] != null &&
                order['customer_image_url'].toString().isNotEmpty)
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "Customer Uploaded Image:",
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 10),
                  Image.network(
                    order['customer_image_url'],
                    width: double.infinity,
                    height: 200,
                    fit: BoxFit.cover,
                    errorBuilder: (ctx, error, stack) =>
                        const Text("⚠️ Failed to load image"),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
