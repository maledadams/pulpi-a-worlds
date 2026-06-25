menu = [
    {"name": "Latte", "price": 3.00, "available": True},
    {"name": "Espresso", "price": 2.00, "available": True},
    {"name": "Water", "price": 0.50, "available": True},
    {"name": "Muffin", "price": 2.50, "available": True}
]

print("Welcome to the Coffee Shop! Here is our menu:")
for item in menu:
    if item["available"]:
        print(f"- {item['name']}: ${item['price']:.2f}")

print("\nPlease enter the name of the item/s you would like to order (comma-separated):")

order = input().split(", ")

total = 0
for item in order:
    found = False
    for menu_item in menu:
        if menu_item["name"].lower() == item.lower() and menu_item["available"]:
            total += menu_item["price"]
            found = True
            break
    if not found:
        print(f"Sorry, {item} is not available.")

print(f"\nYour total is: ${total:.2f}")