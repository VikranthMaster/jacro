import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class Orders extends StatefulWidget {
  const Orders({super.key});

  @override
  State<Orders> createState() => _OrdersState();
}

class _OrdersState extends State<Orders> {
  static const String _baseApi = "http://10.0.2.2:8001";
  List<Map<String, dynamic>> orders = [];
  bool isLoading = false;
  bool creatingDemoOrder = false;
  String selectedGateway = "phonepe";

  final List<String> gateways = ["phonepe", "razorpay", "stripe", "paypal"];

  Future<void> fetchOrders() async {
    setState(() {
      isLoading = true;
    });
    final res = await http.get(Uri.parse("$_baseApi/orders/demo"));
    if (res.statusCode == 200) {
      final parsed = json.decode(res.body);
      final data = parsed["data"] as List<dynamic>? ?? [];
      setState(() {
        orders = data.map((e) => Map<String, dynamic>.from(e)).toList();
      });
    }
    setState(() {
      isLoading = false;
    });
  }

  Future<void> createDemoOrder() async {
    setState(() {
      creatingDemoOrder = true;
    });

    final body = {
      "gateway": selectedGateway,
      "currency": "INR",
      "address": {
        "recipient_name": "Demo Customer",
        "phone": "9999999999",
        "line1": "Demo Street 12",
        "line2": "Near Market",
        "city": "Mumbai",
        "state": "Maharashtra",
        "postal_code": "400001",
        "country": "India"
      },
      "items": [
        {
          "product_name": "Demo Oversized Tee",
          "unit_price": 1499,
          "quantity": 1,
          "size": "L",
          "color": "Black"
        }
      ]
    };

    final res = await http.post(
      Uri.parse("$_baseApi/orders/demo"),
      headers: {"Content-Type": "application/json"},
      body: json.encode(body),
    );

    setState(() {
      creatingDemoOrder = false;
    });

    if (res.statusCode == 200) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Demo order created with $selectedGateway")),
      );
      await fetchOrders();
      return;
    }

    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text("Failed to create demo order")));
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
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: selectedGateway,
                    decoration: const InputDecoration(
                      labelText: "Gateway",
                      border: OutlineInputBorder(),
                    ),
                    items: gateways.map((gateway) {
                      return DropdownMenuItem(
                        value: gateway,
                        child: Text(gateway.toUpperCase()),
                      );
                    }).toList(),
                    onChanged: (value) {
                      if (value == null) return;
                      setState(() {
                        selectedGateway = value;
                      });
                    },
                  ),
                ),
                const SizedBox(width: 10),
                ElevatedButton.icon(
                  onPressed: creatingDemoOrder ? null : createDemoOrder,
                  icon: const Icon(Icons.add_shopping_cart),
                  label: Text(creatingDemoOrder ? "Creating..." : "Demo Order"),
                ),
              ],
            ),
          ),
          if (isLoading)
            const Expanded(child: Center(child: CircularProgressIndicator()))
          else if (orders.isEmpty)
            const Expanded(child: Center(child: Text("No orders yet")))
          else
            Expanded(
              child: RefreshIndicator(
                onRefresh: fetchOrders,
                child: ListView.builder(
                  itemCount: orders.length,
                  itemBuilder: (ctx, i) {
                    final o = orders[i];
                    return Card(
                      margin: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      child: ListTile(
                        leading: ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: (o['product_image'] != null &&
                                  o['product_image'].toString().isNotEmpty)
                              ? Image.network(
                                  o['product_image'],
                                  width: 46,
                                  height: 46,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(
                                    width: 46,
                                    height: 46,
                                    color: Colors.grey.shade200,
                                    alignment: Alignment.center,
                                    child: const Icon(Icons.image_not_supported),
                                  ),
                                )
                              : Container(
                                  width: 46,
                                  height: 46,
                                  color: Colors.grey.shade200,
                                  alignment: Alignment.center,
                                  child: const Icon(Icons.shopping_bag_outlined),
                                ),
                        ),
                        title: Text(o['product_name'] ?? 'Product'),
                        subtitle: Text(
                          "Customer: ${o['recipient_name'] ?? '-'}\n${o['payment_provider'] ?? 'manual'} • ${o['payment_status'] ?? '-'}",
                        ),
                        isThreeLine: true,
                        trailing: const Icon(Icons.arrow_forward_ios),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (ctx) => OrderDetails(order: o),
                            ),
                          );
                        },
                      ),
                    );
                  },
                ),
              ),
            ),
        ],
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
              "Customer: ${order['recipient_name'] ?? '-'}",
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 8),
            Text(
              "Product Name: ${order['product_name']}",
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            if (order['product_image'] != null &&
                order['product_image'].toString().isNotEmpty)
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(
                  order['product_image'],
                  width: double.infinity,
                  height: 200,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) =>
                      const Text("Failed to load product image"),
                ),
              ),
            const SizedBox(height: 8),
            Text("Qty: ${order['quantity'] ?? '-'}"),
            Text("Unit Price: ${order['currency'] ?? 'INR'} ${order['unit_price'] ?? '-'}"),
            Text("Size: ${order['size'] ?? '-'}"),
            Text("Color: ${order['color'] ?? '-'}"),
            const SizedBox(height: 8),
            Text(
              "Price: ${order['currency'] ?? 'INR'} ${order['total_amount'] ?? '-'}",
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text("Gateway: ${order['payment_provider'] ?? '-'}"),
            Text("Payment Status: ${order['payment_status'] ?? '-'}"),
            Text("Order Status: ${order['order_status'] ?? '-'}"),
            const SizedBox(height: 8),
            Text(
              "Address: ${order['address_line_1'] ?? '-'}",
              style: const TextStyle(fontSize: 14),
            ),
            if (order['address_line_2'] != null &&
                order['address_line_2'].toString().isNotEmpty)
              Text("Address 2: ${order['address_line_2']}"),
            Text("City: ${order['city'] ?? '-'}"),
            Text("State: ${order['state'] ?? '-'}"),
            Text("Country: ${order['country'] ?? '-'}"),
            Text("Pincode: ${order['postal_code'] ?? '-'}"),
            Text("Phone: ${order['phone'] ?? '-'}"),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
