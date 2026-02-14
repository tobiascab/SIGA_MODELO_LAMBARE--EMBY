package com.asamblea.config;

import com.asamblea.model.Mesa;
import com.asamblea.model.Sucursal;
import com.asamblea.repository.MesaRepository;
import com.asamblea.repository.SucursalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Optional;

@Component
public class MesasInitializer implements CommandLineRunner {

        @Autowired
        private MesaRepository mesaRepository;

        @Autowired
        private SucursalRepository sucursalRepository;

        @Override
        @Transactional
        public void run(String... args) throws Exception {
                System.out.println("Inicializando datos de Mesas...");

                // SUCURSALES
                Sucursal sanLorenzo = sucursalRepository.findById(4L).orElse(null);
                if (sanLorenzo == null)
                        sanLorenzo = sucursalRepository.findById(1L).orElse(null);

                Sucursal cde = sucursalRepository.findById(2L).orElse(null);
                Sucursal vca = sucursalRepository.findById(3L).orElse(null);

                // --- SAN LORENZO (Mesas 1-11) ---
                if (sanLorenzo != null) {
                        crearMesa(1, 1, 4753, "Mesa 1", sanLorenzo, "RANGO");
                        crearMesa(2, 4757, 12627, "Mesa 2", sanLorenzo, "RANGO");
                        crearMesa(3, 12670, 23006, "Mesa 3", sanLorenzo, "RANGO");
                        crearMesa(4, 25055, 32600, "Mesa 4", sanLorenzo, "RANGO");
                        crearMesa(5, 32638, 41355, "Mesa 5", sanLorenzo, "RANGO");
                        crearMesa(6, 41378, 46341, "Mesa 6", sanLorenzo, "RANGO");
                        crearMesa(7, 46358, 50878, "Mesa 7", sanLorenzo, "RANGO");
                        crearMesa(8, 50898, 53269, "Mesa 8", sanLorenzo, "RANGO");
                        crearMesa(9, 53925, 55993, "Mesa 9", sanLorenzo, "RANGO");
                        crearMesa(10, 55994, 57225, "Mesa 10", sanLorenzo, "RANGO");
                        crearMesa(11, null, null, "Mesa 11 - SOLO VOZ", sanLorenzo, "SOLO_VOZ");
                }

                // --- CIUDAD DEL ESTE (Mesas 1-3) ---
                if (cde != null) {
                        crearMesa(1, 869, 34570, "Mesa 1 (CDE)", cde, "RANGO");
                        crearMesa(2, 34622, 50195, "Mesa 2 (CDE)", cde, "RANGO");
                        crearMesa(3, 50199, 57191, "Mesa 3 (CDE)", cde, "RANGO");
                }

                // --- VILLARRICA (Mesa 4) ---
                if (vca != null) {
                        crearMesa(4, 2372, 57208, "Mesa 4 (Villarrica)", vca, "RANGO");
                }

                System.out.println("Carga de todas las mesas completada.");
        }

        private void crearMesa(Integer numero, Integer desde, Integer hasta, String descripcion, Sucursal sucursal, String tipo) {
                Optional<Mesa> existente = mesaRepository.findAll().stream()
                                .filter(m -> m.getNumero().equals(numero)
                                                && m.getSucursal().getId().equals(sucursal.getId()))
                                .findFirst();

                if (existente.isPresent()) {
                        System.out.println("Mesa " + numero + " de " + sucursal.getNombre() + " ya existe. Omitiendo.");
                        return;
                }

                Mesa mesa = new Mesa();
                mesa.setNumero(numero);
                mesa.setRangoDesde(desde);
                mesa.setRangoHasta(hasta);
                mesa.setDescripcion(descripcion);
                mesa.setSucursal(sucursal);
                mesa.setTipo(tipo);
                mesa.setEncargados(new ArrayList<>());

                mesaRepository.save(mesa);
        }
}
