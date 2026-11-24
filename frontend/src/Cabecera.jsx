export default function Cabecera({ children }) {
  return (
    <header className="cabecera">
      <div className="contenedor barra">
        <div className="marca"><span aria-hidden="true">P</span> Parqueo Tarija</div>
        {children}
      </div>
    </header>
  );
}
