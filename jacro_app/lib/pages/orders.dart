import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class Orders extends StatefulWidget {
  const Orders({super.key});

  @override
  State<Orders> createState() => _OrdersState();
}

class _OrdersState extends State<Orders> {
  List<Map<String, dynamic>> orders = [];
  bool isLoading = false;
  String? loadError;
  final Set<String> _deliveringIds = {};

  Future<List<Map<String, dynamic>>> _buildOrdersPayload(
    List<Map<String, dynamic>> orderRows,
  ) async {
    if (orderRows.isEmpty) return [];

    final supabase = Supabase.instance.client;
    final orderIds = orderRows.map((o) => o['id']).whereType<String>().toList();

    final paymentsRes = await supabase
        .from('payments')
        .select('id, order_id, provider, status, amount, currency, created_at')
        .inFilter('order_id', orderIds);
    final addressesRes = await supabase
        .from('order_addresses')
        .select(
          'order_id, address_type, recipient_name, phone, line1, line2, city, state, postal_code, country, created_at',
        )
        .inFilter('order_id', orderIds);
    final itemsRes = await supabase
        .from('order_items')
        .select(
          'order_id, product_id, product_name, unit_price, quantity, size, color, created_at',
        )
        .inFilter('order_id', orderIds);

    final payments = List<Map<String, dynamic>>.from(paymentsRes);
    final addresses = List<Map<String, dynamic>>.from(addressesRes);
    final items = List<Map<String, dynamic>>.from(itemsRes);

    final productIds = items
        .map((i) => i['product_id'])
        .whereType<String>()
        .toSet()
        .toList();

    final imageByProduct = <String, String>{};
    if (productIds.isNotEmpty) {
      final imagesRes = await supabase
          .from('product_images')
          .select('product_id, image_url')
          .inFilter('product_id', productIds);
      for (final row in List<Map<String, dynamic>>.from(imagesRes)) {
        final pid = row['product_id']?.toString();
        final url = row['image_url']?.toString();
        if (pid != null && url != null && !imageByProduct.containsKey(pid)) {
          imageByProduct[pid] = url;
        }
      }
    }

    final paymentByOrder = <String, Map<String, dynamic>>{};
    for (final p in payments) {
      final oid = p['order_id']?.toString();
      if (oid != null && !paymentByOrder.containsKey(oid)) {
        paymentByOrder[oid] = p;
      }
    }

    final addressByOrder = <String, Map<String, dynamic>>{};
    for (final a in addresses) {
      final oid = a['order_id']?.toString();
      if (oid == null) continue;
      if (a['address_type'] == 'shipping' && !addressByOrder.containsKey(oid)) {
        addressByOrder[oid] = a;
      }
    }

    final itemsByOrder = <String, List<Map<String, dynamic>>>{};
    for (final i in items) {
      final oid = i['order_id']?.toString();
      if (oid == null) continue;
      itemsByOrder.putIfAbsent(oid, () => []).add(i);
    }

    return orderRows.map((o) {
      final oid = o['id']?.toString() ?? '';
      final a = addressByOrder[oid] ?? {};
      final p = paymentByOrder[oid] ?? {};
      final orderItems = (itemsByOrder[oid] ?? []).map((it) {
        final productId = it['product_id']?.toString();
        return {
          'product_id': productId,
          'product_name': it['product_name'],
          'product_image':
              productId != null ? imageByProduct[productId] : null,
          'unit_price': it['unit_price'],
          'quantity': it['quantity'],
          'size': it['size'],
          'color': it['color'],
        };
      }).toList();
      final firstItem =
          orderItems.isNotEmpty ? orderItems.first : <String, dynamic>{};

      return {
        'id': o['id'],
        'order_status': o['order_status'],
        'payment_status': o['payment_status'],
        'payment_provider': p['provider'],
        'payment_method': p['provider'],
        'currency': o['currency'],
        'subtotal': o['subtotal'],
        'shipping_amount': o['shipping_amount'],
        'tax_amount': o['tax_amount'],
        'total_amount': o['total_amount'],
        'recipient_name': a['recipient_name'],
        'phone': a['phone'],
        'address_line_1': a['line1'],
        'address_line_2': a['line2'],
        'city': a['city'],
        'state': a['state'],
        'postal_code': a['postal_code'],
        'country': a['country'],
        'product_name': firstItem['product_name'],
        'product_image': firstItem['product_image'],
        'quantity': firstItem['quantity'],
        'unit_price': firstItem['unit_price'],
        'size': firstItem['size'],
        'color': firstItem['color'],
        'items': orderItems,
        'created_at': o['created_at'],
      };
    }).toList();
  }

  Future<void> fetchOrders() async {
    setState(() {
      isLoading = true;
      loadError = null;
    });
    try {
      final supabase = Supabase.instance.client;
      final orderRows = await supabase
          .from('orders')
          .select(
            'id, order_status, payment_status, currency, subtotal, shipping_amount, tax_amount, total_amount, created_at',
          )
          .neq('order_status', 'delivered')
          .order('created_at', ascending: false)
          .limit(50);

      final rows = List<Map<String, dynamic>>.from(orderRows);
      final data = await _buildOrdersPayload(rows);

      if (!mounted) return;
      setState(() => orders = data);
    } on PostgrestException catch (e) {
      debugPrint('Supabase error: ${e.message}');
      if (!mounted) return;
      setState(() {
        orders = [];
        loadError = e.message;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        orders = [];
        loadError = 'Could not load orders: $e';
      });
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  String _statusLabel(Map o) {
    final pay = (o['payment_status'] ?? '').toString().toLowerCase();
    final st = (o['order_status'] ?? '').toString().toLowerCase();
    if (st == 'delivered') return 'Delivered';
    if (pay == 'paid') {
      if (st == 'processing' || st == 'confirmed' || st.isEmpty) {
        return 'Confirmed';
      }
    }
    if (pay == 'unpaid' || st == 'pending_payment') return 'Awaiting payment';
    return (o['order_status'] ?? '-').toString();
  }

  Color _statusColor(String label) {
    if (label == 'Delivered') return Colors.grey.shade600;
    if (label == 'Confirmed') return Colors.green.shade700;
    if (label == 'Awaiting payment') return Colors.orange.shade800;
    return Colors.grey.shade700;
  }

  Future<void> _markAsDelivered(Map<String, dynamic> order) async {
    final orderId = order['id']?.toString();
    if (orderId == null || _deliveringIds.contains(orderId)) return;

    setState(() => _deliveringIds.add(orderId));
    try {
      await Supabase.instance.client
          .from('orders')
          .update({'order_status': 'delivered'})
          .eq('id', orderId);

      if (!mounted) return;
      setState(() {
        orders.removeWhere((o) => o['id']?.toString() == orderId);
        _deliveringIds.remove(orderId);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Marked as delivered'),
          duration: Duration(seconds: 2),
        ),
      );
    } on PostgrestException catch (e) {
      if (!mounted) return;
      setState(() => _deliveringIds.remove(orderId));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not update: ${e.message}')),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _deliveringIds.remove(orderId));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not update: $e')),
      );
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
      appBar: AppBar(
        title: const Text("Customer orders"),
        actions: [
          IconButton(
            onPressed: isLoading ? null : fetchOrders,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : loadError != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.error_outline,
                            size: 48, color: Colors.red.shade700),
                        const SizedBox(height: 12),
                        Text(
                          loadError!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 15),
                        ),
                        const SizedBox(height: 16),
                        FilledButton.icon(
                          onPressed: fetchOrders,
                          icon: const Icon(Icons.refresh),
                          label: const Text("Retry"),
                        ),
                      ],
                    ),
                  ),
                )
              : orders.isEmpty
              ? const Center(child: Text("No orders yet"))
              : RefreshIndicator(
                  onRefresh: fetchOrders,
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: orders.length,
                    itemBuilder: (ctx, i) {
                      final o = orders[i];
                      final orderId = o['id']?.toString() ?? '';
                      final isDelivering = _deliveringIds.contains(orderId);
                      final status = _statusLabel(o);
                      final items = (o['items'] as List<dynamic>?) ?? [];
                      final itemCount = items.isNotEmpty
                          ? items.length
                          : (o['product_name'] != null ? 1 : 0);
                      final idStr = orderId;
                      final orderShort = idStr.length >= 8
                          ? '${idStr.substring(0, 8)}…'
                          : idStr;

                      return Card(
                        margin: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        child: Row(
                          children: [
                            Padding(
                              padding: const EdgeInsets.only(left: 4),
                              child: isDelivering
                                  ? const Padding(
                                      padding: EdgeInsets.all(12),
                                      child: SizedBox(
                                        width: 24,
                                        height: 24,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      ),
                                    )
                                  : Checkbox(
                                      value: false,
                                      onChanged: (_) => _markAsDelivered(o),
                                    ),
                            ),
                            Expanded(
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: Colors.grey.shade200,
                                  child: Text(
                                    '$itemCount',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Colors.black87,
                                    ),
                                  ),
                                ),
                                title: Text(
                                  o['recipient_name']?.toString() ??
                                      'Customer',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Order $orderShort',
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${o['payment_provider'] ?? 'razorpay'} • ${o['payment_status'] ?? '-'}',
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                    Text(
                                      status,
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: _statusColor(status),
                                      ),
                                    ),
                                  ],
                                ),
                                isThreeLine: true,
                                trailing: Text(
                                  '₹${o['total_amount'] ?? '-'}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                onTap: isDelivering
                                    ? null
                                    : () {
                                        Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (ctx) =>
                                                OrderDetails(order: o),
                                          ),
                                        );
                                      },
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}

class OrderDetails extends StatelessWidget {
  final Map<String, dynamic> order;
  const OrderDetails({super.key, required this.order});

  Widget _section(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        ...children,
        const SizedBox(height: 20),
      ],
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = (order['items'] as List<dynamic>?) ?? [];
    final currency = order['currency']?.toString() ?? 'INR';

    return Scaffold(
      appBar: AppBar(title: const Text("Order details")),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _section("Order", [
              _row("Order ID", order['id']?.toString() ?? '-'),
              _row("Placed", order['created_at']?.toString() ?? '-'),
              _row(
                "Status",
                order['payment_status'] == 'paid'
                    ? 'Confirmed'
                    : (order['order_status']?.toString() ?? 'Awaiting payment'),
              ),
              _row("Payment", order['payment_status']?.toString() ?? '-'),
              _row("Provider", order['payment_provider']?.toString() ?? '-'),
            ]),
            _section("Customer", [
              _row("Name", order['recipient_name']?.toString() ?? '-'),
              _row("Phone", order['phone']?.toString() ?? '-'),
            ]),
            _section("Shipping address", [
              _row("Line 1", order['address_line_1']?.toString() ?? '-'),
              if ((order['address_line_2'] ?? '').toString().isNotEmpty)
                _row("Line 2", order['address_line_2'].toString()),
              _row("City", order['city']?.toString() ?? '-'),
              _row("State", order['state']?.toString() ?? '-'),
              _row("PIN", order['postal_code']?.toString() ?? '-'),
              _row("Country", order['country']?.toString() ?? '-'),
            ]),
            _section("Items (${items.length})", [
              if (items.isEmpty)
                const Text("No line items")
              else
                ...items.map((raw) {
                  final it = Map<String, dynamic>.from(raw as Map);
                  final img = it['product_image']?.toString() ?? '';
                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (img.isNotEmpty)
                            ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: Image.network(
                                img,
                                width: 56,
                                height: 56,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => Container(
                                  width: 56,
                                  height: 56,
                                  color: Colors.grey.shade200,
                                  child: const Icon(Icons.image_not_supported),
                                ),
                              ),
                            )
                          else
                            Container(
                              width: 56,
                              height: 56,
                              decoration: BoxDecoration(
                                color: Colors.grey.shade200,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Icon(Icons.shopping_bag_outlined),
                            ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  it['product_name']?.toString() ?? 'Product',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                Text(
                                  'Qty: ${it['quantity'] ?? '-'} • $currency ${it['unit_price'] ?? '-'}',
                                  style: const TextStyle(fontSize: 12),
                                ),
                                if (it['size'] != null)
                                  Text('Size: ${it['size']}',
                                      style: const TextStyle(fontSize: 12)),
                                if (it['color'] != null)
                                  Text('Color: ${it['color']}',
                                      style: const TextStyle(fontSize: 12)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
            ]),
            _section("Totals", [
              _row("Subtotal", '$currency ${order['subtotal'] ?? '-'}'),
              _row("Shipping", '$currency ${order['shipping_amount'] ?? '0'}'),
              _row("Tax", '$currency ${order['tax_amount'] ?? '0'}'),
              _row(
                "Total",
                '$currency ${order['total_amount'] ?? '-'}',
              ),
            ]),
          ],
        ),
      ),
    );
  }
}
