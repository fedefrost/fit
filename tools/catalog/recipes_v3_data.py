"""Datos del catálogo de recetas v3. Ver recipes_v3.py."""

from recipes_v3_meat import BEEF, CHICKEN, PORK
from recipes_v3_other import COLACIONES, EGGS, FISH, PLANT

PROTEINS = {
    "pollo": CHICKEN,
    "carne vacuna": BEEF,
    "cerdo": PORK,
    "pescados y mariscos": FISH,
    "huevos": EGGS,
    "legumbres y proteína vegetal": PLANT,
}

# Snacks y comida rápida típicos de Sudamérica: (slug, kcal por porción, ml de agua, nombre es, nombre en).
# Sin receta ni ingredientes; las calorías son estimaciones de una porción habitual.
# Las bebidas alcohólicas no suman hidratación.
JUNK = [
    ("junk_beef_empanada", 290, 0, "Empanada de carne (1)", "Beef empanada (1)"),
    ("junk_ham_cheese_empanada", 270, 0, "Empanada de jamón y queso (1)", "Ham and cheese empanada (1)"),
    ("junk_chicken_empanada", 260, 0, "Empanada de pollo (1)", "Chicken empanada (1)"),
    ("junk_humita_empanada", 250, 0, "Empanada de humita (1)", "Corn (humita) empanada (1)"),
    ("junk_choripan", 550, 0, "Choripán", "Choripán (chorizo sandwich)"),
    ("junk_cheeseburger", 550, 0, "Hamburguesa con queso de comida rápida", "Fast-food cheeseburger"),
    ("junk_medium_fries", 380, 0, "Papas fritas (porción mediana)", "French fries (medium)"),
    ("junk_hot_dog", 300, 0, "Pancho", "Hot dog"),
    ("junk_completo", 600, 0, "Completo chileno", "Chilean completo hot dog"),
    ("junk_mozzarella_pizza_slice", 290, 0, "Pizza de muzzarella (1 porción)", "Mozzarella pizza (1 slice)"),
    ("junk_fugazzeta_slice", 330, 0, "Fugazzeta (1 porción)", "Fugazzeta pizza (1 slice)"),
    ("junk_lomito", 850, 0, "Lomito completo", "Lomito steak sandwich"),
    ("junk_chivito", 1000, 0, "Chivito uruguayo", "Uruguayan chivito sandwich"),
    ("junk_milanesa_napolitana_fries", 1100, 0, "Milanesa napolitana con papas fritas", "Milanesa napolitana with fries"),
    ("junk_sandwich_de_miga", 280, 0, "Sándwiches de miga de jamón y queso (2)", "Ham and cheese crustless sandwiches (2)"),
    ("junk_ham_cheese_toastie", 380, 0, "Tostado de jamón y queso", "Ham and cheese toastie"),
    ("junk_medialuna", 190, 0, "Medialuna de manteca", "Butter croissant (medialuna)"),
    ("junk_factura_dulce_leche", 280, 0, "Factura con dulce de leche", "Pastry with dulce de leche"),
    ("junk_chocolate_alfajor", 230, 0, "Alfajor de chocolate", "Chocolate alfajor"),
    ("junk_maicena_alfajor", 180, 0, "Alfajor de maicena", "Cornstarch alfajor"),
    ("junk_chipa", 280, 0, "Chipá (5 unidades)", "Chipá cheese bread (5)"),
    ("junk_pao_de_queijo", 250, 0, "Pão de queijo (4 unidades)", "Pão de queijo (4)"),
    ("junk_coxinha", 320, 0, "Coxinha", "Coxinha"),
    ("junk_pastel_de_feira", 350, 0, "Pastel de feira", "Pastel de feira"),
    ("junk_brigadeiros", 150, 0, "Brigadeiros (2)", "Brigadeiros (2)"),
    ("junk_saltena", 390, 0, "Salteña boliviana", "Bolivian salteña"),
    ("junk_tequenos", 360, 0, "Tequeños (4)", "Tequeños (4)"),
    ("junk_arepa_reina_pepiada", 450, 0, "Arepa reina pepiada", "Arepa reina pepiada"),
    ("junk_cachapa_queso", 520, 0, "Cachapa con queso", "Cachapa with cheese"),
    ("junk_bunuelos", 340, 0, "Buñuelos colombianos (2)", "Colombian buñuelos (2)"),
    ("junk_pandebono", 300, 0, "Pandebono (2)", "Pandebono (2)"),
    ("junk_salchipapa", 700, 0, "Salchipapa", "Salchipapa (sausage and fries)"),
    ("junk_anticuchos", 400, 0, "Anticuchos (2 brochetas)", "Anticuchos (2 skewers)"),
    ("junk_papa_rellena", 350, 0, "Papa rellena", "Papa rellena (stuffed potato)"),
    ("junk_sopaipillas", 300, 0, "Sopaipillas (2)", "Sopaipillas (2)"),
    ("junk_tortas_fritas", 380, 0, "Tortas fritas (2)", "Tortas fritas (2)"),
    ("junk_churros_dulce_leche", 420, 0, "Churros con dulce de leche (3)", "Churros with dulce de leche (3)"),
    ("junk_garrapinada", 500, 0, "Garrapiñada (100 g)", "Candied peanuts (100 g)"),
    ("junk_ice_cream", 280, 30, "Helado (2 bochas)", "Ice cream (2 scoops)"),
    ("junk_potato_chips", 240, 0, "Papas fritas de paquete (45 g)", "Potato chips (45 g)"),
    ("junk_salted_peanuts", 300, 0, "Maní salado (50 g)", "Salted peanuts (50 g)"),
    ("junk_sandwich_cookies", 250, 0, "Galletitas rellenas (5)", "Sandwich cookies (5)"),
    ("junk_milk_chocolate_bar", 530, 0, "Chocolate con leche (100 g)", "Milk chocolate bar (100 g)"),
    ("junk_cola_500ml", 210, 450, "Gaseosa cola (500 ml)", "Cola soda (500 ml)"),
    ("junk_boxed_juice", 90, 180, "Jugo en caja (200 ml)", "Boxed juice (200 ml)"),
    ("junk_beer_can", 200, 0, "Cerveza (lata 473 ml)", "Beer (473 ml can)"),
    ("junk_fernet_cola", 250, 0, "Fernet con cola (vaso)", "Fernet and cola (glass)"),
    ("junk_red_wine_glass", 125, 0, "Vino tinto (copa)", "Red wine (glass)"),
    ("junk_nachos_cheese", 450, 0, "Nachos con queso", "Nachos with cheese"),
    ("junk_bizcochitos_grasa", 300, 0, "Bizcochitos de grasa (porción)", "Bizcochitos de grasa (serving)"),
]
