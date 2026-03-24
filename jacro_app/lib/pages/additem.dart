import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'package:path/path.dart' as path;
import 'package:path_provider/path_provider.dart';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

class Additem extends StatefulWidget {
  const Additem({super.key});

  @override
  State<Additem> createState() => _AdditemState();
}

class _AdditemState extends State<Additem> {
  final TextEditingController name = TextEditingController();
  final TextEditingController price = TextEditingController();
  final TextEditingController desc = TextEditingController();
  String? selectedCategory;
  final List<String> categories = ["Tops", "Outerwear", "Shoes", "Coats"];

  final ImagePicker _picker = ImagePicker();

  List<File> _images = [];

  /// Pick up to 3 images
  Future<void> _pickImage() async {
    if (_images.length >= 3) return;

    final pickedFile = await _picker.pickImage(source: ImageSource.gallery);
    if (pickedFile != null) {
      final dir = await getApplicationDocumentsDirectory();
      final newPath = path.join(dir.path, path.basename(pickedFile.path));
      final savedFile = await File(pickedFile.path).copy(newPath);

      setState(() {
        _images.add(savedFile);
      });
    }
  }

  Future<void> _uploadProduct() async {
    if (name.text.isEmpty ||
        desc.text.isEmpty ||
        price.text.isEmpty ||
        _images.length < 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("⚠️ Please fill all fields & pick 3 images"),
        ),
      );
      return;
    }

    try {
      var uri = Uri.parse("http://10.0.2.2:8000/add_product");

      var request = http.MultipartRequest("POST", uri);

      request.fields['name'] = name.text;
      request.fields['desc'] = desc.text;
      request.fields['price'] = price.text;
      request.fields['category'] = selectedCategory ?? "";

      for (var i = 0; i < _images.length; i++) {
        request.files.add(
          await http.MultipartFile.fromPath('files', _images[i].path),
        );
      }

      var response = await request.send();

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("✅ Product uploaded successfully")),
        );

        // Clear form
        name.clear();
        desc.clear();
        price.clear();

        setState(() {
          _images.clear();
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("❌ Failed: ${response.statusCode}")),
        );
      }
    } catch (e) {
      debugPrint("❌ Error: $e");
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text("❌ Error: $e")));
    }
  }

  void handleSubmit() {
    _uploadProduct();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Add Item")),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: [
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _images.length < 3 ? _images.length + 1 : 3,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
              ),
              itemBuilder: (context, index) {
                if (index == _images.length && _images.length < 3) {
                  return GestureDetector(
                    onTap: _pickImage,
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.add_a_photo,
                        size: 40,
                        color: Colors.black54,
                      ),
                    ),
                  );
                } else {
                  return ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.file(_images[index], fit: BoxFit.cover),
                  );
                }
              },
            ),
            const SizedBox(height: 30),

            TextField(
              controller: name,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: "Product name",
              ),
            ),
            const SizedBox(height: 20),

            TextField(
              controller: price,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: "Product price",
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 20),

            TextField(
              controller: desc,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: "Product description",
              ),
            ),
            const SizedBox(height: 20),

            Center(
              child: DropdownButton<String>(
                hint: Text("Select Category"),
                value: selectedCategory,
                items: categories.map((category) {
                  return DropdownMenuItem(
                    value: category,
                    child: Text(category),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() {
                    selectedCategory = value;
                  });
                },
              ),
            ),

            const SizedBox(height: 20),

            ElevatedButton(
              onPressed: handleSubmit,
              child: const Text("Submit"),
            ),
          ],
        ),
      ),
    );
  }
}
